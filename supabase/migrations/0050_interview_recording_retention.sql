-- Give existing recordings a seven-day download notice; new saves expire seven
-- days after finalisation. Pending marking pauses deletion, not the deadline.
alter table public.interview_attempts add column recording_expires_at timestamptz;
update public.interview_attempts set recording_expires_at=now()+interval '7 days' where upload_status='ready' and video_deleted_at is null;
create index interview_recording_expiry on public.interview_attempts(recording_expires_at) where video_deleted_at is null;
create function public.guard_interview_recording_expiry() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if tg_op='INSERT' then
  new.recording_expires_at:=case when new.upload_status='ready' then now()+interval '7 days' else null end;
 elsif old.recording_expires_at is null and new.upload_status='ready' and old.upload_status<>'ready' then
  new.recording_expires_at:=now()+interval '7 days';
 else new.recording_expires_at:=old.recording_expires_at;
 end if;
 if tg_op='UPDATE' and old.marking_status is null and new.marking_status is not null and old.recording_expires_at<=now() then
  raise exception 'recording_expired';
 end if;
 return new;
end $$;
create trigger interview_recording_expiry before insert or update on public.interview_attempts for each row execute function public.guard_interview_recording_expiry();

create or replace function public.enqueue_interview_retention(p_days integer) returns integer
language plpgsql security definer set search_path=public,pg_temp as $$
declare a public.interview_attempts; n integer:=0;
begin
 -- Kept for compatibility with old callers; the stored seven-day deadline is authoritative.
 if p_days is null or p_days<1 then raise exception 'Invalid retention period';end if;
 for a in select * from public.interview_attempts where video_deleted_at is null and (
  (upload_status in ('awaiting_upload','uploading','failed') and duration_seconds=0 and created_at<now()-interval '24 hours' and marking_status is null)
  or (upload_status='ready' and recording_expires_at<=now() and (marking_status is null or marking_status in ('released','ungradable')))
 ) order by created_at,id for update skip locked limit 100 loop
  update public.interview_attempts set upload_status='discarded',transcription_status=case when transcription_status='processing' then 'failed' else transcription_status end where id=a.id;
  -- Fence an overdue transcription before removing its source; never erase a saved transcript.
  update public.interview_processing_jobs set status='dead',locked_by=null,locked_at=null,last_error_code='recording_expired' where attempt_id=a.id and job_type<>'cleanup' and status in ('queued','failed','running');
  insert into public.interview_processing_jobs(attempt_id,job_type) values(a.id,'cleanup') on conflict(attempt_id,job_type) do nothing;
  n:=n+1;
 end loop;
 return n;
end $$;
revoke all on function public.guard_interview_recording_expiry() from public,anon,authenticated;
-- Owners cannot mint fresh storage URLs after the deadline either.
drop policy "Users read their own interview recordings" on storage.objects;
create policy "Users read their own interview recordings" on storage.objects for select to authenticated using (
 bucket_id='interview-recordings' and (storage.foldername(name))[1]=auth.uid()::text and exists (
  select 1 from public.interview_attempts a where a.user_id=auth.uid() and name in (a.recording_path,a.transcription_audio_path)
  and a.upload_status='ready' and a.video_deleted_at is null
  and (a.recording_expires_at is null or a.recording_expires_at>now() or a.marking_status in ('queued','processing','awaiting_review','in_review','needs_attention'))
 )
);
-- Cleanup completion is media-only, including legacy responses with a zero duration.
-- The old cleanup branch deleted zero-duration attempts, even if they had a transcript.
alter function public.complete_interview_job(uuid,text,jsonb) rename to complete_interview_job_before_retention;
create function public.complete_interview_job(p_job_id uuid,p_worker text,p_payload jsonb) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
declare j public.interview_processing_jobs;a public.interview_attempts;
begin
 select * into j from public.interview_processing_jobs where id=p_job_id;
 if not found then return false;end if;
 if j.job_type<>'cleanup' then return public.complete_interview_job_before_retention(p_job_id,p_worker,p_payload);end if;
 select * into a from public.interview_attempts where id=j.attempt_id for update;
 select * into j from public.interview_processing_jobs where id=p_job_id for update;
 if j.status<>'running' or j.locked_by is distinct from p_worker or a.upload_status<>'discarded' then return false;end if;
 update public.interview_attempts set video_deleted_at=now(),upload_status='ready',transcription_audio_path=null where id=a.id;
 update public.interview_processing_jobs set status='succeeded',locked_at=null,locked_by=null,last_error_code=null,last_error_message=null,updated_at=now() where id=j.id;
 insert into public.interview_marking_events(attempt_id,event_type,metadata) values(a.id,'job_succeeded',jsonb_build_object('job_id',j.id,'stage','cleanup'));
 return true;
end $$;
revoke all on function public.complete_interview_job(uuid,text,jsonb),public.complete_interview_job_before_retention(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.complete_interview_job(uuid,text,jsonb),public.complete_interview_job_before_retention(uuid,text,jsonb) to service_role;
