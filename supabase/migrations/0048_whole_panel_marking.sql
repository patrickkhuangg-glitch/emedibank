-- Opt-in whole-panel workflow. No backfill and no historical assessment changes.
begin;
create table public.interview_mock_markings (
 id uuid primary key default gen_random_uuid(),mock_session_id uuid not null unique,user_id uuid not null references auth.users(id) on delete cascade,
 format text not null default 'panel' check(format='panel'),status text not null default 'waiting_transcripts' check(status in ('waiting_transcripts','queued','processing','awaiting_review','in_review','released','needs_attention','ungradable')),
 assessment jsonb,evidence_audit jsonb,draft_feedback jsonb,approved_feedback jsonb,source_fingerprint text,
 rubric_version text not null default 'emeducate-panel-v1.1' check(rubric_version='emeducate-panel-v1.1'),
 credits_spent integer not null check(credits_spent between 0 and 12),refunded_at timestamptz,
 primary_provider text,primary_model text,audit_provider text,audit_model text,
 private_reviewer_notes text,transcript_correction_notes text,marked_by uuid references auth.users(id) on delete set null,
 lock_version integer not null default 0,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),approved_at timestamptz
);
create table public.interview_mock_marking_members (
 marking_id uuid not null references public.interview_mock_markings(id) on delete cascade,
 attempt_id uuid not null unique references public.interview_attempts(id) on delete cascade,
 sequence_index integer not null check(sequence_index between 0 and 9),primary key(marking_id,sequence_index)
);
create table public.interview_mock_processing_jobs (
 id uuid primary key default gen_random_uuid(),marking_id uuid not null references public.interview_mock_markings(id) on delete cascade,
 job_type text not null check(job_type in ('assess','audit')),status text not null default 'queued' check(status in ('queued','running','succeeded','failed','dead')),
 attempt_count integer not null default 0,max_attempts integer not null default 5,available_at timestamptz not null default now(),locked_at timestamptz,locked_by text,
 last_error_code text,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(marking_id,job_type)
);
create table public.interview_mock_marking_events (
 id uuid primary key default gen_random_uuid(),marking_id uuid not null references public.interview_mock_markings(id) on delete cascade,
 actor_id uuid references auth.users(id) on delete set null,event_type text not null,metadata jsonb not null default '{}',created_at timestamptz not null default now()
);
create index interview_mock_queue_idx on public.interview_mock_markings(status,created_at);
create index interview_mock_jobs_idx on public.interview_mock_processing_jobs(status,available_at);
do $$declare t text;begin foreach t in array array['interview_mock_markings','interview_mock_marking_members','interview_mock_processing_jobs','interview_mock_marking_events'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant all on public.%I to service_role',t);
end loop;end $$;
revoke update,delete on public.interview_mock_marking_events from service_role;
-- Stable lock order for all group mutations: members by UUID, then marking, then jobs.
create function public.lock_panel_members(p_id uuid) returns void language sql security definer set search_path=public,pg_temp as $$
 select a.id from public.interview_attempts a join public.interview_mock_marking_members x on x.attempt_id=a.id where x.marking_id=p_id order by a.id for update of a
$$;
create function public.panel_source_fingerprint(p_id uuid) returns text language sql stable security definer set search_path=public,pg_temp as $$
 select md5(coalesce(string_agg(jsonb_build_array(a.id,a.user_id,a.format,a.station_snapshot,a.questions,a.transcript,a.transcription_status,a.duration_seconds,a.video_deleted_at,a.upload_status,a.recording_path,a.media_kind)::text,'' order by x.sequence_index),'')) from public.interview_mock_marking_members x join public.interview_attempts a on a.id=x.attempt_id where x.marking_id=p_id
$$;
create function public.panel_members_ready(p_id uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select count(*)=10 and bool_and((a.user_id=m.user_id and a.format='panel' and a.media_kind='video' and a.upload_status='ready' and a.video_deleted_at is null
 and a.transcription_status='ready' and length(trim(coalesce(a.transcript,'')))>0
 and a.station_snapshot#>>'{mock_session,id}'=m.mock_session_id::text and a.station_snapshot#>>'{mock_session,mode}'='full'
 and a.station_snapshot#>>'{mock_session,total}'='10' and a.station_snapshot#>>'{mock_session,index}'=x.sequence_index::text) is true)
 from public.interview_mock_markings m join public.interview_mock_marking_members x on x.marking_id=m.id join public.interview_attempts a on a.id=x.attempt_id where m.id=p_id
$$;
create function public.queue_ready_panel(p_id uuid) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare m public.interview_mock_markings;begin
 perform public.lock_panel_members(p_id);select * into m from public.interview_mock_markings where id=p_id for update;
 if not found or m.status not in ('waiting_transcripts','needs_attention') or not public.panel_members_ready(p_id) then return false;end if;
 insert into public.interview_mock_processing_jobs(marking_id,job_type) values(p_id,'assess') on conflict(marking_id,job_type) do nothing;
 if not found then return false;end if;
 update public.interview_mock_markings set status='queued',source_fingerprint=public.panel_source_fingerprint(p_id),updated_at=now() where id=p_id;
 insert into public.interview_mock_marking_events(marking_id,event_type) values(p_id,'assessment_queued');return true;
end $$;
-- Server-only: the application feature flag controls new whole-panel submissions.
create function public.submit_whole_panel_for_marking(p_session_id uuid,p_user_id uuid,p_expected_credits integer) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare ids uuid[];member_row public.interview_attempts;m public.interview_mock_markings;begin
 select array_agg(id order by id) into ids from (select id from public.interview_attempts where user_id=p_user_id and station_snapshot#>>'{mock_session,id}'=p_session_id::text order by id for update) q;
 select * into m from public.interview_mock_markings where mock_session_id=p_session_id for update;
 if found then return jsonb_build_object('status',case when m.user_id=p_user_id then 'already_submitted' else 'not_ready' end,'charged',0);end if;
 if coalesce(array_length(ids,1),0)<>10 or exists(select 1 from public.interview_attempts where id=any(ids) and (format<>'panel' or media_kind<>'video' or station_snapshot#>>'{mock_session,mode}' is distinct from 'full' or station_snapshot#>>'{mock_session,total}' is distinct from '10'))
 or (select count(distinct station_snapshot#>>'{mock_session,index}') from public.interview_attempts where id=any(ids))<>10
 or exists(select 1 from public.interview_attempts a where id=any(ids) and not exists(select 1 from generate_series(0,9) i where i::text=a.station_snapshot#>>'{mock_session,index}')) then return jsonb_build_object('status','not_ready','charged',0);end if;
 -- Existing individual marks use the explicitly labelled legacy path; never reinterpret them.
 if exists(select 1 from public.interview_attempts where id=any(ids) and marking_status is not null) then return jsonb_build_object('status','legacy_response_marks','charged',0);end if;
 if p_expected_credits is distinct from 12 then return jsonb_build_object('status','quote_changed','charged',0);end if;
 if exists(select 1 from public.interview_attempts a where id=any(ids) and (upload_status<>'ready' or video_deleted_at is not null or marking_preflight_at is null or marking_preflight_at<now()-interval '60 seconds' or not exists(select 1 from storage.objects where bucket_id='interview-recordings' and name=a.recording_path))) then return jsonb_build_object('status','not_ready','charged',0);end if;
 update public.profiles set mmi_credits=mmi_credits-12 where id=p_user_id and mmi_credits>=12;
 if not found then return jsonb_build_object('status','no_credits','charged',0);end if;
 insert into public.interview_mock_markings(mock_session_id,user_id,credits_spent) values(p_session_id,p_user_id,12) returning * into m;
 insert into public.interview_mock_marking_members(marking_id,attempt_id,sequence_index) select m.id,id,(station_snapshot#>>'{mock_session,index}')::integer from public.interview_attempts where id=any(ids);
 update public.interview_attempts set marking_status='queued',submitted_for_marking_at=now(),marking_preflight_at=null where id=any(ids);
 for member_row in select * from public.interview_attempts where id=any(ids) and (transcription_status<>'ready' or length(trim(coalesce(transcript,'')))=0) loop
  insert into public.interview_processing_jobs(attempt_id,job_type) values(member_row.id,'transcribe') on conflict(attempt_id,job_type) do update set status=case when interview_processing_jobs.status in ('dead','failed','succeeded') then 'queued' else interview_processing_jobs.status end,attempt_count=case when interview_processing_jobs.status in ('dead','failed','succeeded') then 0 else interview_processing_jobs.attempt_count end,available_at=now();
 end loop;
 insert into public.interview_mock_marking_events(marking_id,actor_id,event_type,metadata) values(m.id,p_user_id,'credit_spent','{"amount":12}');
 perform public.queue_ready_panel(m.id);
 return jsonb_build_object('status','submitted','charged',12);
end $$;
-- Preserve attempt completion except for transcript successors belonging to a whole panel.
alter function public.complete_interview_job(uuid,text,jsonb) rename to complete_interview_job_before_panel;
create function public.complete_interview_job(p_job_id uuid,p_worker text,p_payload jsonb) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare j public.interview_processing_jobs;mid uuid;saved boolean;begin
 select * into j from public.interview_processing_jobs where id=p_job_id;
 select marking_id into mid from public.interview_mock_marking_members where attempt_id=j.attempt_id;
 if mid is null then return public.complete_interview_job_before_panel(p_job_id,p_worker,p_payload);end if;
 perform public.lock_panel_members(mid);perform 1 from public.interview_mock_markings where id=mid for update;
 saved:=public.complete_interview_job_before_panel(p_job_id,p_worker,p_payload);
 if saved and j.job_type='transcribe' then
  -- Same transaction: no attempt assessment can be claimed between completion and removal.
  delete from public.interview_processing_jobs where attempt_id=j.attempt_id and job_type in ('assess','audit');
  perform public.queue_ready_panel(mid);
 end if;return saved;
end $$;
create function public.claim_next_panel_job(p_worker text) returns setof public.interview_mock_processing_jobs language plpgsql security definer set search_path=public,pg_temp as $$
declare j public.interview_mock_processing_jobs;mid uuid;begin
 -- The attempt queue may exhaust a crashed transcription lease without calling fail.
 for mid in select distinct m.id from public.interview_mock_markings m join public.interview_mock_marking_members x on x.marking_id=m.id join public.interview_processing_jobs t on t.attempt_id=x.attempt_id where m.status='waiting_transcripts' and t.job_type='transcribe' and t.status='dead' loop
  perform public.lock_panel_members(mid);perform 1 from public.interview_mock_markings where id=mid for update;
  update public.interview_mock_markings set status='needs_attention',updated_at=now() where id=mid and status='waiting_transcripts';
 end loop;
 -- Reclaim crashed jobs; surface exhausted leases instead of leaving them running forever.
 for j in select * from public.interview_mock_processing_jobs where status='running' and locked_at<now()-interval '10 minutes' and attempt_count>=max_attempts loop
  perform public.lock_panel_members(j.marking_id);perform 1 from public.interview_mock_markings where id=j.marking_id for update;
  update public.interview_mock_processing_jobs set status='dead',locked_by=null,locked_at=null,last_error_code='lease_exhausted' where id=j.id and status='running' and locked_at<now()-interval '10 minutes';
  if found then update public.interview_mock_markings set status='needs_attention',updated_at=now() where id=j.marking_id and status not in ('released','ungradable','in_review');end if;
 end loop;
 return query with candidate as (select q.id from public.interview_mock_processing_jobs q join public.interview_mock_markings m on m.id=q.marking_id where m.status in ('queued','processing','needs_attention') and q.attempt_count<q.max_attempts and ((q.status in ('queued','failed') and q.available_at<=now()) or(q.status='running' and q.locked_at<now()-interval '10 minutes')) order by q.available_at,q.created_at for update of q skip locked limit 1)
 update public.interview_mock_processing_jobs q set status='running',attempt_count=q.attempt_count+1,locked_at=now(),locked_by=p_worker,updated_at=now() from candidate c where q.id=c.id returning q.*;
end $$;
create function public.complete_panel_job(p_job_id uuid,p_worker text,p_payload jsonb) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare j public.interview_mock_processing_jobs;m public.interview_mock_markings;begin
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
  update public.interview_mock_markings set evidence_audit=p_payload->'audit',draft_feedback=assessment->'feedback',audit_provider='openai',audit_model=p_payload->>'model',status='awaiting_review',updated_at=now() where id=m.id;
  update public.interview_attempts set marking_status='awaiting_review' where id in(select attempt_id from public.interview_mock_marking_members where marking_id=m.id);
 end if;
 update public.interview_mock_processing_jobs set status='succeeded',locked_at=null,locked_by=null,last_error_code=null,updated_at=now() where id=j.id;
 insert into public.interview_mock_marking_events(marking_id,event_type,metadata) values(m.id,'job_succeeded',jsonb_build_object('stage',j.job_type));return true;
end $$;
create function public.fail_panel_job(p_job_id uuid,p_worker text,p_code text,p_delay integer) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare j public.interview_mock_processing_jobs;begin
 select * into j from public.interview_mock_processing_jobs where id=p_job_id;if not found then return false;end if;
 perform public.lock_panel_members(j.marking_id);perform 1 from public.interview_mock_markings where id=j.marking_id for update;
 select * into j from public.interview_mock_processing_jobs where id=p_job_id for update;
 if j.status<>'running' or j.locked_by is distinct from p_worker then return false;end if;
 update public.interview_mock_processing_jobs set status=case when attempt_count>=max_attempts then 'dead' else 'failed' end,available_at=now()+make_interval(secs=>greatest(10,least(p_delay,3600))),locked_at=null,locked_by=null,last_error_code=left(p_code,80),updated_at=now() where id=j.id;
 update public.interview_mock_markings set status=case when j.attempt_count>=j.max_attempts then 'needs_attention' else 'processing' end,updated_at=now() where id=j.marking_id and status not in ('released','ungradable','in_review');
 insert into public.interview_mock_marking_events(marking_id,event_type,metadata) values(j.marking_id,'job_failed',jsonb_build_object('stage',j.job_type,'code',left(p_code,80)));return true;
end $$;
create function public.valid_whole_panel_feedback(f jsonb,a jsonb) returns boolean language plpgsql immutable set search_path=public,pg_temp as $$
declare d jsonb;q jsonb;c jsonb;v jsonb;k text;sc numeric;keys text[]:=array['communication_relevance','motivation_medicine','intellectual_curiosity','personal_evidence','reflection_learning','reasoning_judgement','responsiveness_consistency','empathy','teamwork','resilience','community_cultural_respect','programme_alignment'];begin
 if f is null or jsonb_typeof(f)<>'object' or pg_column_size(f)>200000 or f->>'rubric_version' is distinct from 'emeducate-panel-v1.1' or f->>'feedback_version' is distinct from 'whole-panel-feedback-v1'
 or f#>>'{evidence_scope,media_inspected}' is distinct from 'transcript' or f#>>'{evidence_scope,completeness}' is distinct from a#>>'{source,completeness}'
 or f->>'reviewer_note' is distinct from 'Reviewed and approved by an EMeducate reviewer.'
 or not(f ?& array['rubric_version','feedback_version','evidence_scope','question_coverage','domains','global_rating','strengths','priorities','closing_paragraph','concerns','reviewer_note'])
 or exists(select 1 from jsonb_object_keys(f) x where x<>all(array['rubric_version','feedback_version','evidence_scope','question_coverage','domains','global_rating','strengths','priorities','closing_paragraph','concerns','reviewer_note']))
 or coalesce(length(trim(f->>'closing_paragraph')),0) not between 1 and 2000 or position(chr(10) in f->>'closing_paragraph')>0
 or jsonb_typeof(f->'domains') is distinct from 'array' or jsonb_array_length(f->'domains')<>12
 or jsonb_typeof(f->'question_coverage') is distinct from 'array' or jsonb_array_length(f->'question_coverage')<>jsonb_array_length(a#>'{source,sequences}')
 or jsonb_typeof(f->'strengths') is distinct from 'array' or jsonb_array_length(f->'strengths')>5 or jsonb_typeof(f->'priorities') is distinct from 'array' or jsonb_array_length(f->'priorities')>5
 or jsonb_typeof(f->'concerns') is distinct from 'array' or jsonb_array_length(f->'concerns')>12 then return false;end if;
 if (select count(distinct x->>'key') from jsonb_array_elements(f->'domains') x)<>12 or (select count(distinct x->>'sequence') from jsonb_array_elements(f->'question_coverage') x)<>jsonb_array_length(a#>'{source,sequences}') then return false;end if;
 for d in select * from jsonb_array_elements(f->'domains') loop
  k:=d->>'key';if not(d ?& array['key','label','state','score','evidence','why','improvement']) or k<>all(keys) or d->>'state' not in ('scored','not_elicited','insufficient_evidence') or coalesce(length(trim(d->>'why')),0)=0 or jsonb_typeof(d->'evidence') is distinct from 'array' or jsonb_array_length(d->'evidence')>20 or length(d->>'why')>2000 or length(d->>'improvement')>2000 then return false;end if;
  if exists(select 1 from jsonb_array_elements(d->'evidence') r where not exists(select 1 from jsonb_array_elements(a#>'{source,sequences}') s cross join lateral jsonb_array_elements(s->'references') e where e->>'id'=r#>>'{}')) then return false;end if;
  if d->>'state'='scored' then
   if jsonb_typeof(d->'score') is distinct from 'number' then return false;end if;sc:=(d->>'score')::numeric;
   if sc<>trunc(sc) or sc not between 1 and 7 or not exists(select 1 from jsonb_array_elements(d->'evidence') r cross join jsonb_array_elements(a#>'{source,sequences}') s cross join lateral jsonb_array_elements(s->'references') e where e->>'id'=r#>>'{}' and e->>'speaker'='candidate') or jsonb_array_length(d->'evidence')=0 or coalesce(length(trim(d->>'improvement')),0)=0 then return false;end if;
  elsif d->'score' is distinct from 'null'::jsonb then return false;end if;
  if (d->>'state'='not_elicited')=exists(select 1 from jsonb_array_elements(a#>'{plan,tasks}') t where t->'domains' ? k) then return false;end if;
 end loop;
 for v in select * from jsonb_array_elements((f->'strengths')||(f->'priorities')) loop if jsonb_typeof(v) is distinct from 'string' or length(trim(v#>>'{}')) not between 1 and 2000 then return false;end if;end loop;
 for q in select * from jsonb_array_elements(f->'question_coverage') loop
  select * into v from jsonb_array_elements(a#>'{source,sequences}') s where s->>'id'=q->>'sequence';
  if not found or not(q ?& array['sequence','topic','coverage','observation']) or q->>'coverage' not in ('addressed','partly_addressed','not_addressed','not_assessable') or coalesce(length(trim(q->>'observation')),0)=0 or(v->>'availability'<>'available' and q->>'coverage'<>'not_assessable') then return false;end if;
 end loop;
 if coalesce(length(trim(f#>>'{global_rating,basis}')),0)=0 then return false;end if;
 if f#>'{global_rating,score}'='null'::jsonb then if f#>'{global_rating,band}' is distinct from 'null'::jsonb then return false;end if;
 else
  if jsonb_typeof(f#>'{global_rating,score}') is distinct from 'number' then return false;end if;sc:=(f#>>'{global_rating,score}')::numeric;
  if sc<>trunc(sc) or sc not between 1 and 7 or f#>>'{global_rating,band}' is distinct from (array['Very poor','Weak','Below expected','Satisfactory','Good','Strong','Outstanding'])[sc::integer] or a#>>'{source,completeness}'='excerpt' then return false;end if;
  if exists(select 1 from jsonb_array_elements(a#>'{plan,primary_domains}') p where not exists(select 1 from jsonb_array_elements(f->'domains') dom where dom->>'key'=p#>>'{}' and dom->>'state'='scored'))
  or exists(select 1 from jsonb_array_elements(a#>'{plan,tasks}') t where (t->>'primary')::boolean and exists(select 1 from jsonb_array_elements(f->'question_coverage') cov where cov->>'sequence'=t->>'sequence' and cov->>'coverage'='not_assessable')) then return false;end if;
 end if;
 for c in select * from jsonb_array_elements(f->'concerns') loop
  if c->>'level' not in ('clarification_needed','observed_concern','serious_observed_concern') or coalesce(length(trim(c->>'detail')),0)=0 or not exists(select 1 from jsonb_array_elements(a#>'{source,sequences}') s where s->>'id'=c->>'sequence') or position(c->>'sequence' in f->>'closing_paragraph')=0 then return false;end if;
 end loop;return true;
 exception when others then return false;
end $$;
create function public.review_whole_panel(p_id uuid,p_actor_id uuid,p_version integer,p_action text,p_feedback jsonb,p_notes text,p_corrections text,p_watched boolean,p_mapping_checked boolean,p_evidence_checked boolean,p_audit_checked boolean) returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare m public.interview_mock_markings;begin
 if not exists(select 1 from public.profiles where id=p_actor_id and role='admin') then raise exception 'Admin required';end if;
 perform public.lock_panel_members(p_id);select * into m from public.interview_mock_markings where id=p_id for update;
 if not found then return 'not_found';end if;
 if m.status='released' then return 'already_released';end if;
 if m.status='ungradable' then return 'not_eligible';end if;
 if m.lock_version<>p_version then return 'conflict';end if;
 if m.assessment is null or m.evidence_audit is null or m.status not in ('awaiting_review','in_review') or p_action not in ('save','approve') then return 'not_ready';end if;
 if not public.panel_members_ready(p_id) or m.source_fingerprint is distinct from public.panel_source_fingerprint(p_id) then return 'source_changed';end if;
 if p_action='approve' then
  if p_watched is distinct from true or p_mapping_checked is distinct from true or p_evidence_checked is distinct from true or p_audit_checked is distinct from true or not public.valid_whole_panel_feedback(p_feedback,m.assessment) then return 'invalid_feedback';end if;
  if exists(select 1 from public.interview_mock_marking_members x join public.interview_attempts a on a.id=x.attempt_id where x.marking_id=p_id and not exists(select 1 from storage.objects where bucket_id='interview-recordings' and name=a.recording_path)) then return 'media_missing';end if;
 end if;
 if p_feedback is null or jsonb_typeof(p_feedback)<>'object' or pg_column_size(p_feedback)>200000 then return 'invalid_feedback';end if;
 update public.interview_mock_markings set status=case when p_action='approve' then 'released' else 'in_review' end,draft_feedback=p_feedback,approved_feedback=case when p_action='approve' then p_feedback else approved_feedback end,marked_by=case when p_action='approve' then p_actor_id else marked_by end,approved_at=case when p_action='approve' then now() else approved_at end,private_reviewer_notes=left(p_notes,20000),transcript_correction_notes=left(p_corrections,20000),lock_version=lock_version+1,updated_at=now() where id=p_id;
 update public.interview_attempts set marking_status=case when p_action='approve' then 'released' else 'in_review' end,reviewed_at=case when p_action='approve' then now() else reviewed_at end,released_at=case when p_action='approve' then now() else released_at end where id in(select attempt_id from public.interview_mock_marking_members where marking_id=p_id);
 update public.interview_mock_processing_jobs set status='dead',locked_at=null,locked_by=null where marking_id=p_id and status<>'succeeded';
 insert into public.interview_mock_marking_events(marking_id,actor_id,event_type,metadata) values(p_id,p_actor_id,case when p_action='approve' then 'released' else 'draft_saved' end,jsonb_build_object('complete_media_reviewed',p_watched,'mapping_checked',p_mapping_checked,'evidence_checked',p_evidence_checked,'audit_checked',p_audit_checked));
 return case when p_action='approve' then 'released' else 'saved' end;
end $$;
create function public.refund_whole_panel(p_id uuid,p_actor_id uuid,p_reason text) returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare m public.interview_mock_markings;begin
 if not exists(select 1 from public.profiles where id=p_actor_id and role='admin') or coalesce(length(trim(p_reason)),0)=0 then raise exception 'Admin and reason required';end if;
 perform public.lock_panel_members(p_id);select * into m from public.interview_mock_markings where id=p_id for update;
 if not found or m.status='released' then return 'not_eligible';end if;if m.refunded_at is not null then return 'already_refunded';end if;
 update public.profiles set mmi_credits=mmi_credits+m.credits_spent where id=m.user_id;
 update public.interview_mock_markings set status='ungradable',refunded_at=now(),credits_spent=0,lock_version=lock_version+1,updated_at=now() where id=p_id;
 update public.interview_attempts set marking_status='ungradable',reviewed_at=now() where id in(select attempt_id from public.interview_mock_marking_members where marking_id=p_id);
 update public.interview_mock_processing_jobs set status='dead',locked_at=null,locked_by=null where marking_id=p_id and status<>'succeeded';
 update public.interview_processing_jobs set status='dead',locked_at=null,locked_by=null where attempt_id in(select attempt_id from public.interview_mock_marking_members where marking_id=p_id) and status<>'succeeded';
 insert into public.interview_mock_marking_events(marking_id,actor_id,event_type,metadata) values(p_id,p_actor_id,'ungradable_refunded',jsonb_build_object('amount',m.credits_spent,'reason',left(p_reason,2000)));return 'refunded';
end $$;
create function public.retry_panel_job(p_id uuid,p_actor_id uuid,p_stage text) returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare m public.interview_mock_markings;begin
 if not exists(select 1 from public.profiles where id=p_actor_id and role='admin') then raise exception 'Admin required';end if;
 perform public.lock_panel_members(p_id);select * into m from public.interview_mock_markings where id=p_id for update;
 if not found or m.status in ('released','ungradable','in_review') or p_stage not in ('assess','audit') then return 'not_eligible';end if;
 if exists(select 1 from public.interview_mock_processing_jobs where marking_id=p_id and (status='queued' or(status='running' and locked_at>now()-interval '10 minutes'))) then return 'already_queued';end if;
 if not public.panel_members_ready(p_id) then return 'transcripts_missing';end if;
 if p_stage='audit' and (m.assessment is null or m.source_fingerprint is distinct from public.panel_source_fingerprint(p_id)) then return 'assessment_missing';end if;
 if p_stage='assess' then delete from public.interview_mock_processing_jobs where marking_id=p_id and job_type='audit';end if;
 update public.interview_mock_markings set status='queued',assessment=case when p_stage='assess' then null else assessment end,evidence_audit=null,draft_feedback=null,source_fingerprint=public.panel_source_fingerprint(p_id),lock_version=lock_version+1,updated_at=now() where id=p_id;
 insert into public.interview_mock_processing_jobs(marking_id,job_type) values(p_id,p_stage) on conflict(marking_id,job_type) do update set status='queued',attempt_count=0,locked_at=null,locked_by=null,available_at=now();
 insert into public.interview_mock_marking_events(marking_id,actor_id,event_type,metadata) values(p_id,p_actor_id,'retry_requested',jsonb_build_object('stage',p_stage));return 'queued';
end $$;
create function public.get_my_panel_report(p_session_id uuid) returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('sessionId',mock_session_id,'status',status,'feedback',case when status='released' then approved_feedback else null end,'approvedAt',approved_at) from public.interview_mock_markings where mock_session_id=p_session_id and user_id=auth.uid()
$$;
-- Prevent response-level refunds/retries/deletions from breaking a pending whole-panel review.
alter function public.refund_interview_marking(uuid,uuid,text) rename to refund_interview_marking_before_panel;
create function public.refund_interview_marking(p_attempt_id uuid,p_actor_id uuid,p_reason text) returns text language plpgsql security definer set search_path=public,pg_temp as $$begin
 if exists(select 1 from public.interview_mock_marking_members where attempt_id=p_attempt_id) then return 'whole_panel_required';end if;
 return public.refund_interview_marking_before_panel(p_attempt_id,p_actor_id,p_reason);end $$;
alter function public.retry_interview_job(uuid,text,uuid) rename to retry_interview_job_before_panel;
create function public.retry_interview_job(p_attempt_id uuid,p_job_type text,p_actor_id uuid) returns text language plpgsql security definer set search_path=public,pg_temp as $$declare mid uuid;begin
 select marking_id into mid from public.interview_mock_marking_members where attempt_id=p_attempt_id;
 if mid is not null then
  if p_job_type<>'transcribe' then return 'whole_panel_required';end if;
  perform public.lock_panel_members(mid);perform 1 from public.interview_mock_markings where id=mid for update;
  if exists(select 1 from public.interview_mock_markings where id=mid and status in ('released','ungradable','in_review')) then return 'not_eligible';end if;
 end if;return public.retry_interview_job_before_panel(p_attempt_id,p_job_type,p_actor_id);end $$;
alter function public.reserve_interview_deletion(uuid,uuid) rename to reserve_interview_deletion_before_panel;
create function public.reserve_interview_deletion(p_attempt_id uuid,p_user_id uuid) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$declare mid uuid;begin
 select marking_id into mid from public.interview_mock_marking_members where attempt_id=p_attempt_id;
 if mid is not null then perform public.lock_panel_members(mid);perform 1 from public.interview_mock_markings where id=mid for update;
 if exists(select 1 from public.interview_mock_markings where id=mid and status not in ('released','ungradable')) then return false;end if;end if;
 return public.reserve_interview_deletion_before_panel(p_attempt_id,p_user_id);end $$;
alter function public.fail_interview_job(uuid,text,text,integer) rename to fail_interview_job_before_panel;
create function public.fail_interview_job(p_job_id uuid,p_worker text,p_code text,p_delay integer) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$declare mid uuid;saved boolean;begin
 select x.marking_id into mid from public.interview_mock_marking_members x join public.interview_processing_jobs j on j.attempt_id=x.attempt_id where j.id=p_job_id;
 if mid is not null then perform public.lock_panel_members(mid);perform 1 from public.interview_mock_markings where id=mid for update;end if;
 saved:=public.fail_interview_job_before_panel(p_job_id,p_worker,p_code,p_delay);
 if saved and mid is not null and exists(select 1 from public.interview_processing_jobs where id=p_job_id and status='dead') then update public.interview_mock_markings set status='needs_attention',updated_at=now() where id=mid and status not in ('released','ungradable','in_review');end if;return saved;end $$;
-- List the session once in its own queue; exclude member attempts from the old queue.
create or replace function public.list_interview_review_queue(p_format text,p_status text,p_offset integer) returns setof public.interview_attempts language sql stable security definer set search_path=public,pg_temp as $$
 select a.* from public.interview_attempts a where not exists(select 1 from public.interview_mock_marking_members x where x.attempt_id=a.id) and (p_format='' or a.format=p_format) and ((p_status='' and a.marking_status in ('queued','processing','awaiting_review','in_review','needs_attention')) or a.marking_status=p_status) order by case when a.marking_status in ('awaiting_review','in_review') then 0 else 1 end,a.submitted_for_marking_at,a.id limit 100 offset greatest(0,least(p_offset,1000000))
$$;
do $$declare f record;begin for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and (p.proname in ('lock_panel_members','panel_source_fingerprint','panel_members_ready','queue_ready_panel','submit_whole_panel_for_marking','complete_interview_job','claim_next_panel_job','complete_panel_job','fail_panel_job','valid_whole_panel_feedback','review_whole_panel','refund_whole_panel','retry_panel_job','refund_interview_marking','retry_interview_job','reserve_interview_deletion','fail_interview_job') or p.proname like '%\_before\_panel') loop
 execute format('revoke all on function %s from public,anon,authenticated',f.signature);
 execute format('grant execute on function %s to service_role',f.signature);
 if f.signature::text like '%before_panel%' then execute format('revoke all on function %s from service_role',f.signature);end if;
end loop;end $$;
revoke all on function public.get_my_panel_report(uuid) from public,anon,service_role;
grant execute on function public.get_my_panel_report(uuid) to authenticated;

-- Small metadata-only views keep library and queue counts at the assessment unit.
create function get_my_panel_report_index() returns jsonb language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_agg(jsonb_build_object('sessionId',mock_session_id,'status',status)),'[]'::jsonb) from interview_mock_markings where user_id=auth.uid()
$$;
revoke all on function get_my_panel_report_index() from public,anon,authenticated;
grant execute on function get_my_panel_report_index() to authenticated;
create function interview_assessment_counts(p_format text default '',p_status text default '') returns jsonb language sql stable security definer set search_path=public as $$
 with units as (
 select a.format,a.marking_status status from interview_attempts a where a.marking_status is not null and not exists(select 1 from interview_mock_marking_members m where m.attempt_id=a.id)
 union all select format,status from interview_mock_markings
 ) select jsonb_build_object('waiting',count(*) filter(where status in ('waiting_transcripts','queued','processing','awaiting_review','in_review','needs_attention')),'ready',count(*) filter(where status='awaiting_review'),'refunded',count(*) filter(where status='ungradable'),'panel_jobs_queued',(select count(*) from interview_mock_processing_jobs where status='queued'),'panel_jobs_retrying',(select count(*) from interview_mock_processing_jobs where status='failed'),'panel_jobs_dead',(select count(*) from interview_mock_processing_jobs where status='dead'),'individual_total',(select count(*) from interview_attempts a where not exists(select 1 from interview_mock_marking_members m where m.attempt_id=a.id) and (p_format='' or a.format=p_format) and (case when p_status='' then a.marking_status in ('queued','processing','awaiting_review','in_review','needs_attention') else a.marking_status=p_status end))) from units
$$;
revoke all on function interview_assessment_counts(text,text) from public,anon,authenticated;
grant execute on function interview_assessment_counts(text,text) to service_role;

commit;
