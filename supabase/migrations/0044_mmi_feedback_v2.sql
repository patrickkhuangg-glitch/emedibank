-- Prepared locally; apply before enabling MMI feedback v2. No saved reports are rewritten.
-- Application validation additionally verifies canonical source text and every evidence reference.
create function public.valid_mmi_feedback_v2(f jsonb) returns boolean
language plpgsql immutable set search_path=public,pg_temp as $$
declare d jsonb; n numeric;
begin
 if f->>'format_version' is distinct from 'mmi-feedback-v2' or f->>'rubric_version' is distinct from 'emeducate-mmi-2026-09-v2' or f->>'format' is distinct from 'mmi'
 or f ? 'practice_task' or not (f ?& array['station_id','specification','source','reviewer_evidence','reviewer_scope','domains','global','strengths','priorities','concerns','closing'])
 or jsonb_typeof(f->'reviewer_evidence') is distinct from 'array'
 or jsonb_typeof(f->'reviewer_scope') is distinct from 'object'
 or coalesce(f#>>'{reviewer_scope,media_inspected}','') not in ('none','audio','video')
 or coalesce(f#>>'{reviewer_scope,completeness}','') not in ('complete','partial','unknown')
 or coalesce(f#>>'{reviewer_scope,primary_task_coverage}','') not in ('full','excerpt','unknown')
 or jsonb_typeof(f->'domains') is distinct from 'array' or jsonb_array_length(f->'domains')<1
 or jsonb_typeof(f->'strengths') is distinct from 'array' or jsonb_typeof(f->'priorities') is distinct from 'array' or jsonb_typeof(f->'concerns') is distinct from 'array'
 or coalesce(length(trim(f#>>'{closing,verdict}')),0)=0 or coalesce(length(trim(f#>>'{closing,successful_improvement}')),0)=0
 or coalesce(length(trim(f#>>'{global,reason}')),0)=0 then return false; end if;
 for d in select * from jsonb_array_elements(f->'domains') loop
  if d->>'status' not in ('scored','insufficient_evidence','not_applicable') or d->>'status' is null or coalesce(length(trim(d->>'rationale')),0)=0 then return false; end if;
  if d->>'status'='scored' then
   if jsonb_typeof(d->'score') is distinct from 'number' or jsonb_typeof(d->'evidence') is distinct from 'array' or jsonb_array_length(d->'evidence')<1 or coalesce(length(trim(d->>'improvement')),0)=0 then return false; end if;
   n=(d->>'score')::numeric; if n<1 or n>7 or n<>trunc(n) then return false; end if;
  else
   if d->'score' is distinct from 'null'::jsonb or coalesce(d->>'improvement','')<>'' then return false; end if;
   if d->>'status'='insufficient_evidence' and coalesce(length(trim(d->>'needed_evidence')),0)=0 then return false; end if;
  end if;
 end loop;
 if f#>>'{global,status}'='scored' then
  if not exists(select 1 from jsonb_array_elements(f->'domains') d where d->>'status'='scored') or jsonb_typeof(f#>'{global,score}') is distinct from 'number' or (f#>>'{source,primary_task_coverage}'='excerpt' and not (coalesce(jsonb_array_length(f->'reviewer_evidence'),0)>0 and f#>>'{reviewer_scope,primary_task_coverage}'='full')) then return false; end if;
  n=(f#>>'{global,score}')::numeric; if n<1 or n>7 or n<>trunc(n) then return false; end if;
 elsif f#>>'{global,status}'='insufficient_evidence' then
  if f#>'{global,score}' is distinct from 'null'::jsonb then return false; end if;
 else return false; end if;
 return true;
exception when others then return false;
end $$;
revoke all on function public.valid_mmi_feedback_v2(jsonb) from public,anon,authenticated;
grant execute on function public.valid_mmi_feedback_v2(jsonb) to service_role;

create or replace function public.review_interview_marking(p_attempt_id uuid,p_actor_id uuid,p_version integer,p_action text,p_feedback jsonb,p_notes text,p_corrections text,p_watched boolean) returns text
language plpgsql security definer set search_path=public,pg_temp as $$
declare a public.interview_attempts; m public.interview_markings;
begin
 if not exists(select 1 from public.profiles where id=p_actor_id and role='admin') then raise exception 'Admin required'; end if;
 select * into a from public.interview_attempts where id=p_attempt_id for update;
 select * into m from public.interview_markings where attempt_id=p_attempt_id for update;
 if not found then return 'not_found'; end if;
 if m.status='released' then return 'already_released'; end if;
 if m.status='ungradable' then return 'not_eligible'; end if;
 if m.lock_version<>p_version then return 'conflict'; end if;
 if p_action not in ('save','approve','start') then return 'not_eligible'; end if;
 if p_action='approve' then
  if p_watched is distinct from true or p_feedback is null or jsonb_typeof(p_feedback)<>'object' then return 'invalid_feedback'; end if;
  if p_feedback ? 'format_version' then
   if a.format<>'mmi' or not public.valid_mmi_feedback_v2(p_feedback) or p_feedback->>'station_id'<>a.station_id then return 'invalid_feedback'; end if;
  elsif coalesce(length(trim(p_feedback#>>'{overall,summary}')),0)=0 or not (p_feedback ?& array['overall','domains','strengths','priorities','practice_task','reviewer_note']) then return 'invalid_feedback';
  end if;
 end if;
 if p_action='approve' and (a.video_deleted_at is not null or not exists(select 1 from storage.objects where bucket_id='interview-recordings' and name=a.recording_path)) then return 'media_missing'; end if;
 update public.interview_markings set status=case when p_action='approve' then 'released' else 'in_review' end,
 draft_feedback=case when p_action='start' then draft_feedback else p_feedback end,
 private_reviewer_notes=case when p_action='start' then private_reviewer_notes else left(p_notes,20000) end,
 transcript_correction_notes=case when p_action='start' then transcript_correction_notes else left(p_corrections,20000) end,
 marked_by=case when p_action='approve' then p_actor_id else marked_by end,
 approved_at=case when p_action='approve' then now() else approved_at end,updated_at=now(),lock_version=lock_version+1 where id=m.id;
 update public.interview_attempts set marking_status=case when p_action='approve' then 'released' else 'in_review' end,
 approved_feedback=case when p_action='approve' then p_feedback else approved_feedback end,
 reviewed_at=case when p_action='approve' then now() else reviewed_at end,released_at=case when p_action='approve' then now() else released_at end where id=a.id;
 -- Stop late AI work from changing a manual mark or an active human draft.
 update public.interview_processing_jobs set status='dead',locked_by=null,locked_at=null where attempt_id=a.id and job_type in ('assess','audit') and status<>'succeeded';
 insert into public.interview_marking_events(attempt_id,actor_id,event_type,metadata) values(a.id,p_actor_id,case p_action when 'approve' then 'released' when 'start' then 'review_started' else 'draft_saved' end,jsonb_build_object('full_video_reviewed',p_watched));
 return case when p_action='approve' then 'released' else 'saved' end;
end $$;

-- Existing service-only grants, media checks, optimistic locks and human approval remain unchanged.
