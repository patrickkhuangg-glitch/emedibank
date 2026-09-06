-- Private video, durable processing and human-only release. Historical audio is retained.
begin;
alter table public.interview_attempts
 add column media_kind text not null default 'audio' check (media_kind in ('audio','video')),
 add column transcription_audio_path text,
 add column upload_status text not null default 'ready' check (upload_status in ('awaiting_upload','uploading','ready','failed','discarded')),
 add column station_snapshot jsonb not null default '{}'::jsonb,
 add column question_events jsonb not null default '[]'::jsonb,
 add column marking_status text check (marking_status in ('queued','processing','awaiting_review','in_review','released','needs_attention','ungradable')),
 add column credits_spent integer not null default 0 check (credits_spent >= 0),
 add column submitted_for_marking_at timestamptz,
 add column marking_preflight_at timestamptz,
 add column reviewed_at timestamptz,
 add column released_at timestamptz,
 add column approved_feedback jsonb,
 add column video_deleted_at timestamptz;
alter table public.interview_attempts drop constraint interview_attempts_duration_seconds_check;
alter table public.interview_attempts add check (duration_seconds between 0 and 490 and (format <> 'panel' or duration_seconds <= 190));
create index interview_attempts_queue_idx on public.interview_attempts(marking_status, submitted_for_marking_at);
create table public.interview_markings (
 id uuid primary key default gen_random_uuid(),
 attempt_id uuid not null unique references public.interview_attempts(id) on delete cascade,
 status text not null default 'pending' check (status in ('pending','awaiting_review','in_review','released','ungradable')),
 ai_assessment jsonb, evidence_audit jsonb, draft_feedback jsonb,
 private_reviewer_notes text, transcript_correction_notes text,
 primary_provider text, primary_model text, audit_provider text, audit_model text, rubric_version text,
 assigned_to uuid references auth.users(id) on delete set null,
 marked_by uuid references auth.users(id) on delete set null,
 ai_generated_at timestamptz, approved_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 lock_version integer not null default 0
);
create table public.interview_processing_jobs (
 id uuid primary key default gen_random_uuid(),
 attempt_id uuid not null references public.interview_attempts(id) on delete cascade,
 job_type text not null check (job_type in ('transcribe','assess','audit','cleanup')),
 status text not null default 'queued' check (status in ('queued','running','succeeded','failed','dead')),
 attempt_count integer not null default 0, max_attempts integer not null default 5,
 available_at timestamptz not null default now(), locked_at timestamptz, locked_by text,
 last_error_code text, last_error_message text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(attempt_id,job_type)
);
create index interview_jobs_available_idx on public.interview_processing_jobs(status, available_at);
create table public.interview_marking_events (
 id uuid primary key default gen_random_uuid(),
 attempt_id uuid not null references public.interview_attempts(id) on delete cascade,
 actor_id uuid references auth.users(id) on delete set null,
 event_type text not null, metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create index interview_events_attempt_idx on public.interview_marking_events(attempt_id,created_at);
alter table public.interview_markings enable row level security;
alter table public.interview_processing_jobs enable row level security;
alter table public.interview_marking_events enable row level security;
revoke all on public.interview_markings, public.interview_processing_jobs, public.interview_marking_events from anon, authenticated;
grant all on public.interview_markings, public.interview_processing_jobs, public.interview_marking_events to service_role;
revoke update,delete on public.interview_marking_events from service_role;
comment on table public.interview_markings is 'Admin-only working drafts; never expose to students. Application requires requireAdmin.';
comment on table public.interview_marking_events is 'Append-only audit; cascades only when the attempt/account is deleted.';
drop policy "Users insert their own interview attempts" on public.interview_attempts;
drop policy "Users delete their own interview attempts" on public.interview_attempts;
revoke insert,update,delete on public.interview_attempts from anon,authenticated;
-- Prevent mutable storage and orphan uploads: only exact server-created paths are writable.
drop policy "Users upload their own interview recordings" on storage.objects;
drop policy "Users delete their own interview recordings" on storage.objects;
create policy "Upload immutable interview shell media" on storage.objects for insert to authenticated with check (
 bucket_id='interview-recordings' and (storage.foldername(name))[1]=auth.uid()::text
 and exists(select 1 from public.interview_attempts a where a.user_id=auth.uid()
 and a.upload_status in ('awaiting_upload','uploading') and a.created_at > now()-interval '24 hours'
 and name in (a.recording_path,a.transcription_audio_path))
);
update storage.buckets set public=false, file_size_limit=157286400,
 allowed_mime_types=array['video/webm','video/mp4','audio/webm','audio/mp4','audio/mpeg'] where id='interview-recordings';
-- Also protect the existing balance against direct profile writes regardless of profile policies.
create function public.protect_interview_credit_balance() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if current_user in ('anon','authenticated') and new.mmi_credits is distinct from old.mmi_credits then
 raise exception 'Interview credits are server controlled'; end if;
 return new;
end $$;
create trigger protect_interview_credits before update on public.profiles for each row execute function public.protect_interview_credit_balance();

create function public.submit_interview_for_marking(p_attempt_id uuid) returns text
language plpgsql security definer set search_path=public,pg_temp as $$
declare a public.interview_attempts; first_job text;
begin
 select * into a from public.interview_attempts where id=p_attempt_id and user_id=auth.uid() for update;
 if not found then return 'not_ready'; end if;
 if a.marking_status is not null then return 'already_submitted'; end if;
 if a.marking_preflight_at is null or a.marking_preflight_at<now()-interval '60 seconds' or a.upload_status <> 'ready' or a.video_deleted_at is not null or not exists(
 select 1 from storage.objects where bucket_id='interview-recordings' and name=a.recording_path
 ) then return 'not_ready'; end if;
 update public.profiles set mmi_credits=mmi_credits-1 where id=a.user_id and mmi_credits>=1;
 if not found then return 'no_credits'; end if;
 first_job := case when a.transcription_status='ready' and length(trim(a.transcript))>0 then 'assess' else 'transcribe' end;
 update public.interview_attempts set credits_spent=1,marking_status='queued',submitted_for_marking_at=now(),marking_preflight_at=null where id=a.id;
 insert into public.interview_markings(attempt_id) values(a.id);
 insert into public.interview_processing_jobs(attempt_id,job_type) values(a.id,first_job)
 on conflict(attempt_id,job_type) do update set status=case when interview_processing_jobs.status in ('dead','failed') then 'queued' else interview_processing_jobs.status end,
 attempt_count=case when interview_processing_jobs.status in ('dead','failed') then 0 else interview_processing_jobs.attempt_count end, available_at=now();
 insert into public.interview_marking_events(attempt_id,actor_id,event_type,metadata) values(a.id,auth.uid(),'credit_spent','{"amount":1}');
 return 'submitted';
end $$;
revoke all on function public.submit_interview_for_marking(uuid) from public,anon;
grant execute on function public.submit_interview_for_marking(uuid) to authenticated;

create function public.refund_interview_marking(p_attempt_id uuid,p_actor_id uuid,p_reason text) returns text
language plpgsql security definer set search_path=public,pg_temp as $$
declare a public.interview_attempts;
begin
 if not exists(select 1 from public.profiles where id=p_actor_id and role='admin') or length(trim(p_reason))=0 then raise exception 'Admin and reason required'; end if;
 select * into a from public.interview_attempts where id=p_attempt_id for update;
 if not found or a.marking_status is null or a.marking_status='released' then return 'not_eligible'; end if;
 if a.marking_status='ungradable' then return 'already_refunded'; end if;
 update public.profiles set mmi_credits=mmi_credits+a.credits_spent where id=a.user_id;
 update public.interview_attempts set credits_spent=0,marking_status='ungradable',reviewed_at=now() where id=a.id;
 update public.interview_markings set status='ungradable',marked_by=p_actor_id,updated_at=now(),lock_version=lock_version+1 where attempt_id=a.id;
 update public.interview_processing_jobs set status='dead',locked_by=null,locked_at=null where attempt_id=a.id and status<>'succeeded';
 insert into public.interview_marking_events(attempt_id,actor_id,event_type,metadata) values(a.id,p_actor_id,'ungradable_refunded',jsonb_build_object('amount',a.credits_spent,'reason',left(p_reason,1000)));
 return 'refunded';
end $$;

create function public.claim_next_interview_job(p_worker text) returns setof public.interview_processing_jobs
language plpgsql security definer set search_path=public,pg_temp as $$
declare j public.interview_processing_jobs;
begin
 -- Terminal stale leases must not remain running forever after the last crash.
 for j in select * from public.interview_processing_jobs where status='running' and locked_at<now()-interval '10 minutes' and attempt_count>=max_attempts limit 100 loop
 perform 1 from public.interview_attempts where id=j.attempt_id for update skip locked;
 if not found then continue; end if;
 update public.interview_processing_jobs set status='dead',locked_by=null,locked_at=null,last_error_code='lease_exhausted',last_error_message='Worker lease expired',updated_at=now() where id=j.id and status='running' and locked_at<now()-interval '10 minutes';
 if not found then continue; end if;
 update public.interview_attempts set marking_status=case when marking_status in ('queued','processing') then 'needs_attention' else marking_status end,transcription_status=case when j.job_type='transcribe' then 'failed' else transcription_status end where id=j.attempt_id;
 insert into public.interview_marking_events(attempt_id,event_type,metadata) values(j.attempt_id,'job_dead',jsonb_build_object('job_id',j.id,'code','lease_exhausted'));
 end loop;
 return query with candidate as (
 select id from public.interview_processing_jobs where attempt_count<max_attempts and
 ((status in ('queued','failed') and available_at<=now()) or (status='running' and locked_at<now()-interval '10 minutes'))
 order by available_at,created_at for update skip locked limit 1
 ) update public.interview_processing_jobs q set status='running',attempt_count=q.attempt_count+1,locked_at=now(),locked_by=p_worker,updated_at=now()
 from candidate c where q.id=c.id returning q.*;
end $$;

-- One transaction persists a fenced provider result, succeeds its job and queues its successor.
create function public.complete_interview_job(p_job_id uuid,p_worker text,p_payload jsonb) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
declare j public.interview_processing_jobs; a public.interview_attempts; successor text;
begin
 select * into j from public.interview_processing_jobs where id=p_job_id;
 if not found then return false; end if;
 select * into a from public.interview_attempts where id=j.attempt_id for update;
 select * into j from public.interview_processing_jobs where id=p_job_id for update;
 if j.status<>'running' or j.locked_by is distinct from p_worker then return false; end if;
 if a.upload_status<>'ready' and j.job_type<>'cleanup' then
 update public.interview_processing_jobs set status='dead',locked_by=null,locked_at=null where id=j.id;
 return false;
 end if;
 if j.job_type='cleanup' then
 if a.duration_seconds=0 and a.marking_status is null then delete from public.interview_attempts where id=a.id; return true; end if;
 update public.interview_attempts set video_deleted_at=now(),upload_status='ready',transcription_audio_path=null where id=a.id;
 elsif j.job_type='transcribe' then
 if coalesce(length(trim(p_payload->>'text')),0)<12 then raise exception 'Invalid transcript'; end if;
 update public.interview_attempts set transcript=p_payload->>'text',transcription_status='ready',transcription_model=p_payload->>'model' where id=a.id;
 if a.marking_status in ('queued','processing','needs_attention') then successor:='assess'; end if;
 elsif j.job_type='assess' and a.marking_status in ('queued','processing','needs_attention') then
 update public.interview_markings set ai_assessment=p_payload->'assessment',primary_provider='openai',primary_model=p_payload->>'model',rubric_version=p_payload->>'rubric_version',ai_generated_at=now(),updated_at=now() where attempt_id=a.id and status='pending';
 successor:='audit';
 elsif j.job_type='audit' and a.marking_status in ('queued','processing','needs_attention') then
 update public.interview_markings set evidence_audit=p_payload->'audit',draft_feedback=coalesce(draft_feedback,p_payload->'feedback'),audit_provider='openai',audit_model=p_payload->>'model',status='awaiting_review',updated_at=now() where attempt_id=a.id and status='pending';
 update public.interview_attempts set marking_status='awaiting_review' where id=a.id;
 end if;
 update public.interview_processing_jobs set status='succeeded',locked_at=null,locked_by=null,last_error_code=null,last_error_message=null,updated_at=now() where id=j.id;
 if successor is not null then
 insert into public.interview_processing_jobs(attempt_id,job_type) values(a.id,successor) on conflict(attempt_id,job_type) do nothing;
 update public.interview_attempts set marking_status='processing' where id=a.id and marking_status in ('queued','needs_attention');
 end if;
 insert into public.interview_marking_events(attempt_id,event_type,metadata) values(a.id,'job_succeeded',jsonb_build_object('job_id',j.id,'stage',j.job_type));
 return true;
end $$;

create function public.fail_interview_job(p_job_id uuid,p_worker text,p_code text,p_delay integer) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
declare j public.interview_processing_jobs; terminal boolean;
begin
 select * into j from public.interview_processing_jobs where id=p_job_id;
 if not found then return false; end if;
 perform 1 from public.interview_attempts where id=j.attempt_id for update;
 select * into j from public.interview_processing_jobs where id=p_job_id for update;
 if j.status<>'running' or j.locked_by is distinct from p_worker then return false; end if;
 terminal:=j.attempt_count>=j.max_attempts;
 update public.interview_processing_jobs set status=case when terminal then 'dead' else 'failed' end,available_at=now()+make_interval(secs=>greatest(10,least(p_delay,3600))),locked_at=null,locked_by=null,last_error_code=left(p_code,60),last_error_message='Processing failed; inspect configuration or retry from review.',updated_at=now() where id=j.id;
 if terminal then
 update public.interview_attempts set marking_status=case when marking_status in ('queued','processing') then 'needs_attention' else marking_status end,transcription_status=case when j.job_type='transcribe' then 'failed' else transcription_status end where id=j.attempt_id;
 end if;
 insert into public.interview_marking_events(attempt_id,event_type,metadata) values(j.attempt_id,case when terminal then 'job_dead' else 'job_retry' end,jsonb_build_object('job_id',j.id,'code',left(p_code,60)));
 return true;
end $$;

create function public.finalise_interview_upload(p_attempt_id uuid,p_user_id uuid,p_duration integer,p_events jsonb,p_has_audio boolean) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
declare a public.interview_attempts;
begin
 select * into a from public.interview_attempts where id=p_attempt_id and user_id=p_user_id for update;
 if not found then return false; end if;
 if a.upload_status='ready' then return true; end if;
 if a.upload_status not in ('awaiting_upload','uploading') then return false; end if;
 update public.interview_attempts set upload_status='ready',duration_seconds=p_duration,question_events=p_events,transcription_status=case when p_has_audio then 'processing' else 'failed' end where id=a.id;
 if p_has_audio then insert into public.interview_processing_jobs(attempt_id,job_type) values(a.id,'transcribe') on conflict do nothing; end if;
 return true;
end $$;

-- Optimistic review lock and terminal-state checks protect against stale tabs and double clicks.
create function public.review_interview_marking(p_attempt_id uuid,p_actor_id uuid,p_version integer,p_action text,p_feedback jsonb,p_notes text,p_corrections text,p_watched boolean) returns text
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
 if p_action='approve' and (not p_watched or p_feedback is null or jsonb_typeof(p_feedback)<>'object'
 or coalesce(length(trim(p_feedback#>>'{overall,summary}')),0)=0 or not (p_feedback ?& array['overall','domains','strengths','priorities','practice_task','reviewer_note'])) then return 'invalid_feedback'; end if;
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

create function public.retry_interview_job(p_attempt_id uuid,p_job_type text,p_actor_id uuid) returns text
language plpgsql security definer set search_path=public,pg_temp as $$
declare a public.interview_attempts; staff boolean;
begin
 select * into a from public.interview_attempts where id=p_attempt_id for update;
 staff:=exists(select 1 from public.profiles where id=p_actor_id and role='admin');
 if not found or (not staff and a.user_id<>p_actor_id) or p_job_type not in ('transcribe','assess','audit') then return 'not_eligible'; end if;
 if a.upload_status<>'ready' or (p_job_type<>'transcribe' and (not staff or a.marking_status is null or a.marking_status in ('released','ungradable'))) then return 'not_eligible'; end if;
 if p_job_type='transcribe' and a.transcription_status='ready' then return 'already_ready'; end if;
 if exists(select 1 from public.interview_processing_jobs where attempt_id=a.id and status='running' and locked_at>now()-interval '10 minutes') then return 'already_running'; end if;
 if p_job_type='transcribe' then
 if a.media_kind='video' and a.transcription_audio_path is null then return 'audio_missing'; end if;
 update public.interview_attempts set transcription_status='processing' where id=a.id;
 elsif p_job_type='assess' then
 if a.transcription_status<>'ready' then return 'transcript_missing'; end if;
 delete from public.interview_processing_jobs where attempt_id=a.id and job_type='audit';
 update public.interview_markings set status='pending',evidence_audit=null,updated_at=now(),lock_version=lock_version+1 where attempt_id=a.id;
 else
 if not exists(select 1 from public.interview_markings where attempt_id=a.id and ai_assessment is not null) then return 'assessment_missing'; end if;
 update public.interview_markings set status='pending',updated_at=now(),lock_version=lock_version+1 where attempt_id=a.id;
 end if;
 if a.marking_status is not null and a.marking_status not in ('released','ungradable') and (p_job_type<>'transcribe' or a.marking_status in ('queued','processing','needs_attention')) then update public.interview_attempts set marking_status='queued' where id=a.id; end if;
 insert into public.interview_processing_jobs(attempt_id,job_type) values(a.id,p_job_type) on conflict(attempt_id,job_type) do update set status='queued',attempt_count=0,available_at=now(),locked_by=null,locked_at=null,updated_at=now();
 insert into public.interview_marking_events(attempt_id,actor_id,event_type,metadata) values(a.id,p_actor_id,'retry_requested',jsonb_build_object('stage',p_job_type));
 return 'queued';
end $$;
-- Reserve cleanup under the same attempt lock used by submission/review. This closes
-- the retention-vs-submission race before storage objects are removed.
create function public.enqueue_interview_retention(p_days integer) returns integer
language plpgsql security definer set search_path=public,pg_temp as $$
declare a public.interview_attempts; count_jobs integer:=0;
begin
 if p_days<1 or p_days>3650 then raise exception 'Invalid retention period'; end if;
 for a in select * from public.interview_attempts where media_kind='video' and video_deleted_at is null and (
 (upload_status in ('awaiting_upload','uploading','failed') and created_at<now()-interval '24 hours' and marking_status is null)
 or (upload_status='ready' and ((marking_status is null and created_at<now()-make_interval(days=>p_days))
 or (marking_status='released' and released_at<now()-make_interval(days=>p_days))
 or (marking_status='ungradable' and reviewed_at<now()-make_interval(days=>p_days))))
 ) order by created_at for update skip locked limit 100 loop
 update public.interview_attempts set upload_status='discarded' where id=a.id;
 insert into public.interview_processing_jobs(attempt_id,job_type) values(a.id,'cleanup') on conflict(attempt_id,job_type) do nothing;
 count_jobs:=count_jobs+1;
 end loop;
 return count_jobs;
end $$;
create function public.reserve_interview_deletion(p_attempt_id uuid,p_user_id uuid) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform 1 from public.interview_attempts where id=p_attempt_id and user_id=p_user_id for update;
 if not found then return false; end if;
 update public.interview_attempts set upload_status='discarded' where id=p_attempt_id;
 update public.interview_processing_jobs set status='dead',locked_by=null,locked_at=null where attempt_id=p_attempt_id and status<>'succeeded';
 return true;
end $$;
create function public.list_interview_review_queue(p_format text,p_status text,p_offset integer) returns setof public.interview_attempts
language sql stable security definer set search_path=public,pg_temp as $$
 select * from public.interview_attempts
 where (p_format='' or format=p_format)
 and ((p_status='' and marking_status in ('queued','processing','awaiting_review','in_review','needs_attention')) or marking_status=p_status)
 order by case when marking_status in ('awaiting_review','in_review') then 0 else 1 end,submitted_for_marking_at,id
 limit 100 offset greatest(0,least(p_offset,1000000));
$$;
-- All server operations explicitly deny public execution, including future default grants.
do $$ declare f record; begin for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('refund_interview_marking','claim_next_interview_job','complete_interview_job','fail_interview_job','finalise_interview_upload','review_interview_marking','retry_interview_job','enqueue_interview_retention','reserve_interview_deletion','list_interview_review_queue') loop
 execute format('revoke all on function %s from public, anon, authenticated',f.signature);
 execute format('grant execute on function %s to service_role',f.signature);
end loop; end $$;
commit;
