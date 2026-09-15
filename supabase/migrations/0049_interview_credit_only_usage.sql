-- Free practice has no daily or cumulative storage allowance. Marking remains
-- credit-funded through the existing atomic submission/refund functions.
-- NULL explicitly disables a usage cap; positive values can be restored by an
-- operator without changing recording data, historical usage or credit balances.
begin;
alter table public.interview_security_limits
 alter column recording_daily_limit drop not null,
 alter column recording_daily_limit drop default,
 alter column recording_storage_bytes drop not null,
 alter column recording_storage_bytes drop default,
 alter column transcription_daily_limit drop not null,
 alter column transcription_daily_limit drop default,
 alter column transcription_global_daily_limit drop not null,
 alter column transcription_global_daily_limit drop default;

create or replace function public.enforce_interview_recording_quota() returns trigger
language plpgsql security definer set search_path='' as $$
declare limits public.interview_security_limits; used_bytes numeric; reserved_bytes numeric;
  practice_audio boolean := new.media_kind='audio' and coalesce(new.station_snapshot->>'source','')='practice_audio';
  object_limit constant bigint := 157286400;
begin
  select * into strict limits from public.interview_security_limits where id;
  if limits.recording_daily_limit is not null or limits.recording_storage_bytes is not null then
    perform pg_advisory_xact_lock(hashtextextended('interview-recording:'||new.user_id::text,0));
    -- Re-read after waiting for a concurrent capped operation.
    select * into strict limits from public.interview_security_limits where id;
  end if;
  if limits.recording_daily_limit is not null and not practice_audio then
    if (select count(*) from public.interview_resource_usage where user_id=new.user_id
        and resource='recording' and created_at > now()-interval '24 hours') >= limits.recording_daily_limit then
      raise exception 'recording_daily_limit';
    end if;
  end if;

  -- Do not scan all of a student's stored objects when storage is unrestricted.
  -- Keep the existing accounting available for an explicit operator rollback.
  if limits.recording_storage_bytes is not null then
    with objects as (
      select name,case when metadata->>'size' ~ '^[0-9]{1,20}$'
        then (metadata->>'size')::numeric else object_limit end as bytes
      from storage.objects where bucket_id='interview-recordings'
        and (storage.foldername(name))[1]=new.user_id::text
    ), pending as (
      select distinct path from public.interview_attempts a
      cross join lateral unnest(array[a.recording_path,a.transcription_audio_path]) path
      where a.user_id=new.user_id and a.upload_status in ('awaiting_upload','uploading')
        and a.created_at > now()-interval '24 hours' and path is not null
    )
    select coalesce((select sum(bytes) from objects),0),
      coalesce((select sum(greatest(0,object_limit-coalesce(o.bytes,0)))
        from pending p left join objects o on o.name=p.path),0)
      into used_bytes,reserved_bytes;
    if used_bytes+reserved_bytes+object_limit*(1+case when new.transcription_audio_path is null then 0 else 1 end)
        > limits.recording_storage_bytes then raise exception 'recording_storage_limit'; end if;
  end if;
  -- Preserve historical recording accounting: mock responses consume one usage
  -- entry, practice audio does not consume the former mock allowance.
  if not practice_audio then
    insert into public.interview_resource_usage(user_id,resource) values(new.user_id,'recording');
  end if;
  return new;
end $$;

create or replace function public.consume_interview_transcription(p_user_id uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare limits public.interview_security_limits;
begin
  if p_user_id is null then return false; end if;
  select * into strict limits from public.interview_security_limits where id;
  if limits.transcription_daily_limit is not null or limits.transcription_global_daily_limit is not null then
    perform pg_advisory_xact_lock(hashtextextended('interview-transcription-global',0));
    select * into strict limits from public.interview_security_limits where id;
    if (limits.transcription_global_daily_limit is not null and
        (select count(*) from public.interview_resource_usage where resource='transcription'
          and created_at > now()-interval '24 hours') >= limits.transcription_global_daily_limit)
      or (limits.transcription_daily_limit is not null and
        (select count(*) from public.interview_resource_usage where user_id=p_user_id and resource='transcription'
          and created_at > now()-interval '24 hours') >= limits.transcription_daily_limit) then
      return false;
    end if;
  end if;
  -- Retain metering for every provider invocation, including retries.
  insert into public.interview_resource_usage(user_id,resource) values(p_user_id,'transcription');
  return true;
end $$;
revoke all on function public.enforce_interview_recording_quota(),public.consume_interview_transcription(uuid) from public,anon,authenticated;
grant execute on function public.consume_interview_transcription(uuid) to service_role;

update public.interview_security_limits set recording_daily_limit=null,recording_storage_bytes=null,
 transcription_daily_limit=null,transcription_global_daily_limit=null where id;

-- Release quota-only deferrals promptly; preserve provider backoff and leases.
update public.interview_processing_jobs set available_at=least(available_at,now()),
 last_error_code=null,last_error_message=null,updated_at=now()
 where job_type='transcribe' and status='queued' and last_error_code='transcription_quota';
commit;
