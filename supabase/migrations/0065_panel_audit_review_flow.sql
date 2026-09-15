-- Preserve tutor control when a whole-panel evidence audit is pending or fails.
-- Tutor edits are retained when the audit later completes; release still requires the audit.
begin;

create or replace function public.classify_panel_response(p_id uuid,p_attempt_id uuid,p_actor_id uuid,p_disposition text) returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare m public.interview_mock_markings;r public.interview_attempts;
begin
 if not exists(select 1 from public.profiles where id=p_actor_id and role='admin') then raise exception 'Admin required';end if;
 if p_disposition not in ('insubstantial','not_answered') then return 'invalid_disposition';end if;
 perform public.lock_panel_members(p_id);
 select * into m from public.interview_mock_markings where id=p_id for update;
 if not found then return 'not_found';end if;
 if m.status not in ('waiting_transcripts','needs_attention') or m.assessment is not null then return 'not_eligible';end if;
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

create or replace function public.complete_panel_job(p_job_id uuid,p_worker text,p_payload jsonb) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
declare j public.interview_mock_processing_jobs;m public.interview_mock_markings;next_status text;begin
 select * into j from public.interview_mock_processing_jobs where id=p_job_id;if not found then return false;end if;
 perform public.lock_panel_members(j.marking_id);select * into m from public.interview_mock_markings where id=j.marking_id for update;
 select * into j from public.interview_mock_processing_jobs where id=p_job_id for update;
 if j.status<>'running' or j.locked_by is distinct from p_worker or m.status not in ('queued','processing','needs_attention') then return false;end if;
 if not public.panel_members_ready(m.id) or m.source_fingerprint is distinct from public.panel_source_fingerprint(m.id) then raise exception 'Panel source changed';end if;
 if j.job_type='assess' then
  if p_payload#>>'{assessment,mode}' is distinct from 'panel_complete' or p_payload#>>'{assessment,feedback,rubric_version}' is distinct from 'emeducate-panel-v1.1' then raise exception 'Invalid panel assessment';end if;
  update public.interview_mock_markings set assessment=p_payload->'assessment',primary_provider='openai',primary_model=p_payload->>'model',status='processing',updated_at=now() where id=m.id;
  insert into public.interview_mock_processing_jobs(marking_id,job_type) values(m.id,'audit') on conflict(marking_id,job_type) do nothing;
 else
  if m.assessment is null or jsonb_typeof(p_payload->'audit') is distinct from 'object' then raise exception 'Invalid panel audit';end if;
  next_status:=case when m.draft_feedback is null then 'awaiting_review' else 'in_review' end;
  update public.interview_mock_markings set evidence_audit=p_payload->'audit',draft_feedback=coalesce(draft_feedback,assessment->'feedback'),audit_provider='openai',audit_model=p_payload->>'model',status=next_status,updated_at=now() where id=m.id;
  update public.interview_attempts set marking_status=next_status where id in(select attempt_id from public.interview_mock_marking_members where marking_id=m.id);
 end if;
 update public.interview_mock_processing_jobs set status='succeeded',locked_at=null,locked_by=null,last_error_code=null,updated_at=now() where id=j.id;
 insert into public.interview_mock_marking_events(marking_id,event_type,metadata) values(m.id,'job_succeeded',jsonb_build_object('stage',j.job_type));return true;
end $$;

create or replace function public.review_whole_panel(p_id uuid,p_actor_id uuid,p_version integer,p_action text,p_feedback jsonb,p_notes text,p_corrections text,p_watched boolean,p_mapping_checked boolean,p_evidence_checked boolean,p_audit_checked boolean) returns text
language plpgsql security definer set search_path=public,pg_temp as $$
declare m public.interview_mock_markings;next_status text;begin
 if not exists(select 1 from public.profiles where id=p_actor_id and role='admin') then raise exception 'Admin required';end if;
 perform public.lock_panel_members(p_id);select * into m from public.interview_mock_markings where id=p_id for update;
 if not found then return 'not_found';end if;
 if m.status='released' then return 'already_released';end if;
 if m.status='ungradable' then return 'not_eligible';end if;
 if m.lock_version<>p_version then return 'conflict';end if;
 if m.assessment is null or p_action not in ('save','approve') then return 'not_ready';end if;
 if p_action='save' and m.status not in ('processing','needs_attention','awaiting_review','in_review') then return 'not_ready';end if;
 if p_action='approve' and (m.evidence_audit is null or m.status not in ('awaiting_review','in_review')) then return 'not_ready';end if;
 if not public.panel_members_ready(p_id) or m.source_fingerprint is distinct from public.panel_source_fingerprint(p_id) then return 'source_changed';end if;
 if p_feedback is null or jsonb_typeof(p_feedback)<>'object' or pg_column_size(p_feedback)>200000 then return 'invalid_feedback';end if;
 if p_action='approve' then
  if p_watched is distinct from true or p_mapping_checked is distinct from true or p_evidence_checked is distinct from true or p_audit_checked is distinct from true or not public.valid_whole_panel_feedback(p_feedback,m.assessment) then return 'invalid_feedback';end if;
  if exists(select 1 from public.interview_mock_marking_members x join public.interview_attempts a on a.id=x.attempt_id where x.marking_id=p_id and not exists(select 1 from storage.objects where bucket_id='interview-recordings' and name=a.recording_path)) then return 'media_missing';end if;
 end if;
 next_status:=case when p_action='approve' then 'released' when m.evidence_audit is not null then 'in_review' else m.status end;
 update public.interview_mock_markings set status=next_status,draft_feedback=p_feedback,approved_feedback=case when p_action='approve' then p_feedback else approved_feedback end,marked_by=case when p_action='approve' then p_actor_id else marked_by end,approved_at=case when p_action='approve' then now() else approved_at end,private_reviewer_notes=left(p_notes,20000),transcript_correction_notes=left(p_corrections,20000),lock_version=lock_version+1,updated_at=now() where id=p_id;
 update public.interview_attempts set marking_status=next_status,reviewed_at=case when p_action='approve' then now() else reviewed_at end,released_at=case when p_action='approve' then now() else released_at end where id in(select attempt_id from public.interview_mock_marking_members where marking_id=p_id);
 if p_action='approve' or m.evidence_audit is not null then update public.interview_mock_processing_jobs set status='dead',locked_at=null,locked_by=null where marking_id=p_id and status<>'succeeded';end if;
 insert into public.interview_mock_marking_events(marking_id,actor_id,event_type,metadata) values(p_id,p_actor_id,case when p_action='approve' then 'released' else 'draft_saved' end,jsonb_build_object('complete_media_reviewed',p_watched,'mapping_checked',p_mapping_checked,'evidence_checked',p_evidence_checked,'audit_checked',p_audit_checked));
 return case when p_action='approve' then 'released' else 'saved' end;
end $$;

create or replace function public.retry_panel_job(p_id uuid,p_actor_id uuid,p_stage text) returns text
language plpgsql security definer set search_path=public,pg_temp as $$
declare m public.interview_mock_markings;begin
 if not exists(select 1 from public.profiles where id=p_actor_id and role='admin') then raise exception 'Admin required';end if;
 perform public.lock_panel_members(p_id);select * into m from public.interview_mock_markings where id=p_id for update;
 if not found or m.status in ('released','ungradable','in_review') or p_stage not in ('assess','audit') then return 'not_eligible';end if;
 if exists(select 1 from public.interview_mock_processing_jobs where marking_id=p_id and (status='queued' or(status='running' and locked_at>now()-interval '10 minutes'))) then return 'already_queued';end if;
 if not public.panel_members_ready(p_id) then return 'transcripts_missing';end if;
 if p_stage='audit' and (m.assessment is null or m.source_fingerprint is distinct from public.panel_source_fingerprint(p_id)) then return 'assessment_missing';end if;
 if p_stage='assess' then delete from public.interview_mock_processing_jobs where marking_id=p_id and job_type='audit';end if;
 update public.interview_mock_markings set status='queued',assessment=case when p_stage='assess' then null else assessment end,evidence_audit=null,draft_feedback=case when p_stage='assess' then null else draft_feedback end,source_fingerprint=public.panel_source_fingerprint(p_id),lock_version=lock_version+1,updated_at=now() where id=p_id;
 insert into public.interview_mock_processing_jobs(marking_id,job_type) values(p_id,p_stage) on conflict(marking_id,job_type) do update set status='queued',attempt_count=0,locked_at=null,locked_by=null,available_at=now(),last_error_code=null,updated_at=now();
 insert into public.interview_mock_marking_events(marking_id,actor_id,event_type,metadata) values(p_id,p_actor_id,'retry_requested',jsonb_build_object('stage',p_stage));return 'queued';
end $$;

revoke all on function public.complete_panel_job(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.complete_panel_job(uuid,text,jsonb) to service_role;
revoke all on function public.classify_panel_response(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.classify_panel_response(uuid,uuid,uuid,text) to service_role;
revoke all on function public.review_whole_panel(uuid,uuid,integer,text,jsonb,text,text,boolean,boolean,boolean,boolean) from public,anon,authenticated;
grant execute on function public.review_whole_panel(uuid,uuid,integer,text,jsonb,text,text,boolean,boolean,boolean,boolean) to service_role;
revoke all on function public.retry_panel_job(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.retry_panel_job(uuid,uuid,text) to service_role;

commit;
