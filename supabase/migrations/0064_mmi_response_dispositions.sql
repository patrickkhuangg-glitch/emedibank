-- Let an admin resolve a transcript-free individual MMI after reviewing its recording.
-- AI assessment remains a separate, explicit action and never fabricates candidate speech.
begin;

create function public.classify_mmi_response(p_attempt_id uuid,p_actor_id uuid,p_disposition text) returns text
language plpgsql security definer set search_path=public,pg_temp as $$
declare a public.interview_attempts;m public.interview_markings;
begin
 if not exists(select 1 from public.profiles where id=p_actor_id and role='admin') then raise exception 'Admin required';end if;
 if p_disposition not in ('insubstantial','not_answered') then return 'invalid_disposition';end if;
 select * into a from public.interview_attempts where id=p_attempt_id for update;
 if not found or a.format<>'mmi' or exists(select 1 from public.interview_mock_marking_members where attempt_id=p_attempt_id) then return 'not_eligible';end if;
 select * into m from public.interview_markings where attempt_id=p_attempt_id for update;
 if not found or a.marking_status<>'needs_attention' or m.status in ('released','ungradable','in_review') then return 'not_eligible';end if;
 if a.response_disposition=p_disposition then return 'already_saved';end if;
 if a.transcription_status<>'failed' or length(trim(coalesce(a.transcript,'')))>0 then return 'not_eligible';end if;
 update public.interview_attempts set response_disposition=p_disposition,response_disposition_at=now() where id=p_attempt_id;
 update public.interview_processing_jobs set status='succeeded',locked_at=null,locked_by=null,last_error_code=null,last_error_message=null,updated_at=now()
  where attempt_id=p_attempt_id and job_type='transcribe' and status<>'succeeded';
 update public.interview_markings set lock_version=lock_version+1,updated_at=now() where id=m.id;
 insert into public.interview_marking_events(attempt_id,actor_id,event_type,metadata)
  values(p_attempt_id,p_actor_id,'response_classified',jsonb_build_object('disposition',p_disposition));
 return 'saved';
end $$;

create function public.start_mmi_assessment(p_attempt_id uuid,p_actor_id uuid) returns text
language plpgsql security definer set search_path=public,pg_temp as $$
declare a public.interview_attempts;m public.interview_markings;
begin
 if not exists(select 1 from public.profiles where id=p_actor_id and role='admin') then raise exception 'Admin required';end if;
 select * into a from public.interview_attempts where id=p_attempt_id for update;
 if not found or a.format<>'mmi' or exists(select 1 from public.interview_mock_marking_members where attempt_id=p_attempt_id) then return 'not_eligible';end if;
 select * into m from public.interview_markings where attempt_id=p_attempt_id for update;
 if not found or a.upload_status<>'ready' or a.marking_status is null or a.marking_status in ('released','ungradable','in_review') or m.status in ('released','ungradable','in_review')
 or a.transcription_status<>'failed' or length(trim(coalesce(a.transcript,'')))>0 or coalesce(a.response_disposition,'') not in ('insubstantial','not_answered') then return 'not_eligible';end if;
 if exists(select 1 from public.interview_processing_jobs where attempt_id=p_attempt_id and job_type='assess' and (status='queued' or (status='running' and locked_at>now()-interval '10 minutes'))) then return 'already_running';end if;
 delete from public.interview_processing_jobs where attempt_id=p_attempt_id and job_type='audit';
 update public.interview_markings set status='pending',ai_assessment=null,evidence_audit=null,draft_feedback=null,primary_provider=null,primary_model=null,audit_provider=null,audit_model=null,ai_generated_at=null,lock_version=lock_version+1,updated_at=now() where id=m.id;
 update public.interview_attempts set marking_status='queued' where id=p_attempt_id;
 insert into public.interview_processing_jobs(attempt_id,job_type) values(p_attempt_id,'assess')
  on conflict(attempt_id,job_type) do update set status='queued',attempt_count=0,available_at=now(),locked_by=null,locked_at=null,last_error_code=null,last_error_message=null,updated_at=now();
 insert into public.interview_marking_events(attempt_id,actor_id,event_type,metadata)
  values(p_attempt_id,p_actor_id,'disposition_assessment_requested',jsonb_build_object('disposition',a.response_disposition));
 return 'queued';
end $$;

-- A fresh transcription clears any earlier recording-review classification. The normal
-- retry control also delegates disposition-backed MMI assessment to the explicit starter.
create or replace function public.retry_interview_job(p_attempt_id uuid,p_job_type text,p_actor_id uuid) returns text
language plpgsql security definer set search_path=public,pg_temp as $$
declare mid uuid;result text;had_disposition boolean:=false;
begin
 select marking_id into mid from public.interview_mock_marking_members where attempt_id=p_attempt_id;
 select response_disposition is not null into had_disposition from public.interview_attempts where id=p_attempt_id;
 if mid is not null then
  if p_job_type<>'transcribe' then return 'whole_panel_required';end if;
  perform public.lock_panel_members(mid);perform 1 from public.interview_mock_markings where id=mid for update;
  if exists(select 1 from public.interview_mock_markings where id=mid and status in ('released','ungradable','in_review')) then return 'not_eligible';end if;
 elsif p_job_type='assess' and had_disposition then
  return public.start_mmi_assessment(p_attempt_id,p_actor_id);
 end if;
 result:=public.retry_interview_job_before_panel(p_attempt_id,p_job_type,p_actor_id);
 if result='queued' and p_job_type='transcribe' and had_disposition then
  update public.interview_attempts set response_disposition=null,response_disposition_at=null where id=p_attempt_id;
  if mid is not null then
   update public.interview_mock_markings set lock_version=lock_version+1,updated_at=now() where id=mid;
   insert into public.interview_mock_marking_events(marking_id,actor_id,event_type,metadata)
    values(mid,p_actor_id,'response_classification_cleared',jsonb_build_object('attempt_id',p_attempt_id));
  else
   update public.interview_markings set lock_version=lock_version+1,updated_at=now() where attempt_id=p_attempt_id;
   insert into public.interview_marking_events(attempt_id,actor_id,event_type,metadata)
    values(p_attempt_id,p_actor_id,'response_classification_cleared','{}'::jsonb);
  end if;
 end if;
 return result;
end $$;

revoke all on function public.classify_mmi_response(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.classify_mmi_response(uuid,uuid,text) to service_role;
revoke all on function public.start_mmi_assessment(uuid,uuid) from public,anon,authenticated;
grant execute on function public.start_mmi_assessment(uuid,uuid) to service_role;
revoke all on function public.retry_interview_job(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.retry_interview_job(uuid,text,uuid) to service_role;

commit;
