-- Let an admin resolve transcript-free panel responses after listening to the recording.
-- The choice is preserved as assessment evidence; AI marking still requires an explicit start.
begin;

alter table public.interview_attempts
 add column response_disposition text check(response_disposition in ('insubstantial','not_answered')),
 add column response_disposition_at timestamptz;

create or replace function public.panel_source_fingerprint(p_id uuid) returns text language sql stable security definer set search_path=public,pg_temp as $$
 select md5(coalesce(string_agg(jsonb_build_array(a.id,a.user_id,a.format,a.station_snapshot,a.questions,a.transcript,a.transcription_status,a.response_disposition,a.duration_seconds,a.video_deleted_at,a.upload_status,a.recording_path,a.media_kind)::text,'' order by x.sequence_index),''))
 from public.interview_mock_marking_members x
 join public.interview_attempts a on a.id=x.attempt_id
 where x.marking_id=p_id
$$;

create or replace function public.panel_members_ready(p_id uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select count(*) between 2 and 10 and bool_and((a.user_id=m.user_id and a.format='panel' and a.media_kind='video' and a.upload_status='ready' and a.video_deleted_at is null
 and ((a.transcription_status='ready' and length(trim(coalesce(a.transcript,'')))>0 and a.response_disposition is null)
   or (a.response_disposition in ('insubstantial','not_answered') and length(trim(coalesce(a.transcript,'')))=0))
 and a.station_snapshot#>>'{mock_session,id}'=m.mock_session_id::text and a.station_snapshot#>>'{mock_session,mode}'='full'
 and a.station_snapshot#>>'{mock_session,total}'='10' and a.station_snapshot#>>'{mock_session,index}'=x.sequence_index::text) is true)
 from public.interview_mock_markings m
 join public.interview_mock_marking_members x on x.marking_id=m.id
 join public.interview_attempts a on a.id=x.attempt_id
 where m.id=p_id
$$;

create function public.classify_panel_response(p_id uuid,p_attempt_id uuid,p_actor_id uuid,p_disposition text) returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare m public.interview_mock_markings;r public.interview_attempts;
begin
 if not exists(select 1 from public.profiles where id=p_actor_id and role='admin') then raise exception 'Admin required';end if;
 if p_disposition not in ('insubstantial','not_answered') then return 'invalid_disposition';end if;
 perform public.lock_panel_members(p_id);
 select * into m from public.interview_mock_markings where id=p_id for update;
 if not found then return 'not_found';end if;
 if m.status not in ('waiting_transcripts','needs_attention') then return 'not_eligible';end if;
 select a.* into r from public.interview_attempts a join public.interview_mock_marking_members x on x.attempt_id=a.id where x.marking_id=p_id and a.id=p_attempt_id;
 if not found or r.user_id<>m.user_id then return 'not_found';end if;
 if r.response_disposition=p_disposition then return 'already_saved';end if;
 if r.transcription_status<>'failed' or length(trim(coalesce(r.transcript,'')))>0 then return 'not_eligible';end if;
 update public.interview_attempts set response_disposition=p_disposition,response_disposition_at=now() where id=p_attempt_id;
 update public.interview_processing_jobs set status='succeeded',locked_at=null,locked_by=null,last_error_code=null,updated_at=now()
  where attempt_id=p_attempt_id and job_type='transcribe' and status<>'succeeded';
 update public.interview_mock_markings set lock_version=lock_version+1,updated_at=now() where id=p_id;
 insert into public.interview_mock_marking_events(marking_id,actor_id,event_type,metadata)
  values(p_id,p_actor_id,'response_classified',jsonb_build_object('attempt_id',p_attempt_id,'disposition',p_disposition));
 return 'saved';
end $$;

-- Choosing a fresh transcription removes any earlier manual classification.
create or replace function public.retry_interview_job(p_attempt_id uuid,p_job_type text,p_actor_id uuid) returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare mid uuid;result text;
begin
 select marking_id into mid from public.interview_mock_marking_members where attempt_id=p_attempt_id;
 if mid is not null then
  if p_job_type<>'transcribe' then return 'whole_panel_required';end if;
  perform public.lock_panel_members(mid);perform 1 from public.interview_mock_markings where id=mid for update;
  if exists(select 1 from public.interview_mock_markings where id=mid and status in ('released','ungradable','in_review')) then return 'not_eligible';end if;
 end if;
 result:=public.retry_interview_job_before_panel(p_attempt_id,p_job_type,p_actor_id);
 if result='queued' and mid is not null then
  update public.interview_attempts set response_disposition=null,response_disposition_at=null where id=p_attempt_id;
  update public.interview_mock_markings set lock_version=lock_version+1,updated_at=now() where id=mid;
  insert into public.interview_mock_marking_events(marking_id,actor_id,event_type,metadata) values(mid,p_actor_id,'response_classification_cleared',jsonb_build_object('attempt_id',p_attempt_id));
 end if;
 return result;
end $$;

revoke all on function public.classify_panel_response(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.classify_panel_response(uuid,uuid,uuid,text) to service_role;
revoke all on function public.retry_interview_job(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.retry_interview_job(uuid,text,uuid) to service_role;

commit;
