-- Practice audio has no daily recording-count cap and does not consume the mock allowance.
-- Keep the existing storage check, lock and transcription quotas.
begin;
create or replace function public.enforce_interview_recording_quota() returns trigger
language plpgsql security definer set search_path='' as $$
declare limits public.interview_security_limits; used_bytes numeric; reserved_bytes numeric;
  practice_audio boolean := new.media_kind='audio' and coalesce(new.station_snapshot->>'source','')='practice_audio';
  object_limit constant bigint := 157286400; -- bucket limit: 150 MiB for either object
begin
  perform pg_advisory_xact_lock(hashtextextended('interview-recording:'||new.user_id::text,0));
  select * into strict limits from public.interview_security_limits where id;
  if not practice_audio and (select count(*) from public.interview_resource_usage where user_id=new.user_id
      and resource='recording' and created_at > now()-interval '24 hours') >= limits.recording_daily_limit then
    raise exception 'recording_daily_limit';
  end if;

  -- Storage metadata is written by Storage, not taken from the browser. Unknown
  -- sizes reserve the entire object allowance. Include legacy/orphaned objects.
  with objects as (
    select name, case when metadata->>'size' ~ '^[0-9]{1,20}$'
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

  if not practice_audio then
    insert into public.interview_resource_usage(user_id,resource) values(new.user_id,'recording');
  end if;
  return new;
end $$;
revoke all on function public.enforce_interview_recording_quota() from public,anon,authenticated;
commit;
