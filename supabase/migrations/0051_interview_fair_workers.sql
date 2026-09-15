-- One admission gate for both marking queues, shared by every route invocation.
create table public.interview_worker_turns(user_id uuid primary key references public.profiles(id) on delete cascade,last_served_at timestamptz not null);
alter table public.interview_worker_turns enable row level security;
revoke all on public.interview_worker_turns from public,anon,authenticated;
grant all on public.interview_worker_turns to service_role;
create function public.claim_fair_interview_job(p_worker text,p_cleanup boolean default false,p_queue text default null) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare c record;j record;result jsonb;active_count integer;
begin
 if p_worker is null or length(p_worker)<1 or length(p_worker)>100 then raise exception 'Invalid worker';end if;
 -- Serialise admission only; provider calls happen after this transaction ends.
 perform pg_advisory_xact_lock(76124,case when p_cleanup then 2 else 1 end);
 -- Terminal crashed leases remain visible to tutors and cannot consume a slot forever.
 for j in select * from public.interview_processing_jobs where status='running' and locked_at<now()-interval '10 minutes' and attempt_count>=max_attempts and (job_type='cleanup')=p_cleanup loop
  perform public.fail_interview_job(j.id,j.locked_by,'lease_exhausted',30);
 end loop;
 if not p_cleanup then
  for j in select * from public.interview_mock_processing_jobs where status='running' and locked_at<now()-interval '10 minutes' and attempt_count>=max_attempts loop
   perform public.fail_panel_job(j.id,j.locked_by,'lease_exhausted',30);
  end loop;
 end if;
 select count(*) into active_count from (
  select id from public.interview_processing_jobs where status='running' and locked_at>=now()-interval '10 minutes' and (job_type='cleanup')=p_cleanup
  union all select id from public.interview_mock_processing_jobs where not p_cleanup and status='running' and locked_at>=now()-interval '10 minutes'
 ) live;
 if active_count>=(case when p_cleanup then 2 else 4 end) then return null;end if;
 with runnable as (
  select q.id,'attempt'::text queue,a.user_id,q.available_at,q.created_at from public.interview_processing_jobs q join public.interview_attempts a on a.id=q.attempt_id
  where (p_queue is null or p_queue='attempt') and (q.job_type='cleanup')=p_cleanup and q.attempt_count<q.max_attempts
   and ((q.status in ('queued','failed') and q.available_at<=now()) or (q.status='running' and q.locked_at<now()-interval '10 minutes'))
  union all
  select q.id,'panel',m.user_id,q.available_at,q.created_at from public.interview_mock_processing_jobs q join public.interview_mock_markings m on m.id=q.marking_id
  where not p_cleanup and (p_queue is null or p_queue='panel') and m.status in ('queued','processing','needs_attention') and q.attempt_count<q.max_attempts
   and ((q.status in ('queued','failed') and q.available_at<=now()) or (q.status='running' and q.locked_at<now()-interval '10 minutes'))
 ), busy as (
  select a.user_id from public.interview_processing_jobs q join public.interview_attempts a on a.id=q.attempt_id where q.status='running' and q.locked_at>=now()-interval '10 minutes' and q.job_type<>'cleanup'
  union all select m.user_id from public.interview_mock_processing_jobs q join public.interview_mock_markings m on m.id=q.marking_id where q.status='running' and q.locked_at>=now()-interval '10 minutes'
 ) select r.* into c from runnable r left join public.interview_worker_turns t on t.user_id=r.user_id
 where p_cleanup or (select count(*) from busy b where b.user_id=r.user_id)<2
 order by t.last_served_at nulls first,r.available_at,r.created_at,r.id limit 1;
 if not found then return null;end if;
 if c.queue='attempt' then
  -- SKIP LOCKED avoids waiting behind a simultaneous tutor/deletion transaction.
  perform 1 from public.interview_processing_jobs where id=c.id for update skip locked;
  if not found then return null;end if;
  update public.interview_processing_jobs q set status='running',locked_by=p_worker,locked_at=now(),attempt_count=q.attempt_count+1,updated_at=now() where id=c.id and q.attempt_count<q.max_attempts and ((q.status in ('queued','failed') and q.available_at<=now()) or (q.status='running' and q.locked_at<now()-interval '10 minutes')) returning to_jsonb(q.*) into result;
  if not found then return null;end if;
 else
  perform 1 from public.interview_mock_processing_jobs where id=c.id for update skip locked;
  if not found then return null;end if;
  update public.interview_mock_processing_jobs q set status='running',locked_by=p_worker,locked_at=now(),attempt_count=q.attempt_count+1,updated_at=now() where id=c.id and q.attempt_count<q.max_attempts and ((q.status in ('queued','failed') and q.available_at<=now()) or (q.status='running' and q.locked_at<now()-interval '10 minutes')) returning to_jsonb(q.*) into result;
  if not found then return null;end if;
 end if;
 if not p_cleanup then insert into public.interview_worker_turns values(c.user_id,clock_timestamp()) on conflict(user_id) do update set last_served_at=excluded.last_served_at;end if;
 return jsonb_build_object('queue',c.queue,'job',result);
end $$;
-- Existing service callers also respect the global bound during rollout.
create or replace function public.claim_next_interview_job(p_worker text) returns setof public.interview_processing_jobs language plpgsql security definer set search_path=public,pg_temp as $$
declare r jsonb;begin r:=public.claim_fair_interview_job(p_worker,false,'attempt');if r is not null then return next jsonb_populate_record(null::public.interview_processing_jobs,r->'job');end if;end $$;
create or replace function public.claim_next_panel_job(p_worker text) returns setof public.interview_mock_processing_jobs language plpgsql security definer set search_path=public,pg_temp as $$
declare r jsonb;begin r:=public.claim_fair_interview_job(p_worker,false,'panel');if r is not null then return next jsonb_populate_record(null::public.interview_mock_processing_jobs,r->'job');end if;end $$;
revoke all on function public.claim_fair_interview_job(text,boolean,text) from public,anon,authenticated;
grant execute on function public.claim_fair_interview_job(text,boolean,text) to service_role;
