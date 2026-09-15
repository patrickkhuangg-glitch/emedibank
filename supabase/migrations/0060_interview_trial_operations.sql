begin;
create or replace function public.claim_fair_interview_job(p_worker text,p_cleanup boolean default false,p_queue text default null) returns jsonb
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
 where p_cleanup or (
  (select count(*) from busy b where b.user_id=r.user_id)<case when exists(select 1 from interview_trial_claims where user_id=r.user_id) and not interview_full_access(r.user_id) then 1 else 2 end
  -- At most one trial worker globally leaves three slots available to paid work.
  and (not exists(select 1 from interview_trial_claims where user_id=r.user_id) or interview_full_access(r.user_id) or (
   (select enabled and not processing_paused from interview_trial_settings where id)
   and (select coalesce(sum(cents),0) from interview_trial_spend where created_at>=date_trunc('month',now() at time zone 'UTC') at time zone 'UTC')<(select monthly_budget_cents from interview_trial_settings where id)
   and not exists(select 1 from busy b join interview_trial_claims t on t.user_id=b.user_id where not interview_full_access(b.user_id))
  ))
 )
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

-- Runs inside the existing monitor/alert wrapper, retaining its deduplicated deliveries.
alter function public.check_interview_operations_base() rename to check_interview_operations_before_trials;
create function public.check_interview_operations_base() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb;prior interview_operation_incidents;lim interview_trial_settings;spend bigint;issue boolean;begin
 select * into prior from interview_operation_incidents where code='trial_spending';
 result:=check_interview_operations_before_trials();
 select * into lim from interview_trial_settings where id;
 select coalesce(sum(cents),0) into spend from interview_trial_spend where created_at>=date_trunc('month',now() at time zone 'UTC') at time zone 'UTC';
 issue:=lim.enabled and (lim.processing_paused or spend>=lim.warning_cents);
 if issue then
  insert into interview_operation_incidents(code,first_seen_at,last_seen_at) values('trial_spending',now(),now())
  on conflict(code) do update set first_seen_at=case when prior.resolved_at is null and prior.first_seen_at is not null then prior.first_seen_at else now() end,last_seen_at=now(),resolved_at=null;
  result:=jsonb_set(result,'{issues}',(result->'issues')||'"trial_spending"'::jsonb);
 end if;
 return jsonb_set(result,'{metrics}',(result->'metrics')||jsonb_build_object('trial_reserved_cents',spend,'trial_budget_cents',lim.monthly_budget_cents,'trial_processing_paused',lim.processing_paused or spend>=lim.monthly_budget_cents));
end $$;
revoke all on function public.check_interview_operations_before_trials(),public.check_interview_operations_base() from public,anon,authenticated,service_role;
-- Budget pauses do not exhaust a student's retries or discard submitted marking.
create function public.defer_interview_trial_job(p_job uuid,p_worker text,p_panel boolean default false) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if p_panel then
  update interview_mock_processing_jobs set status='queued',attempt_count=greatest(0,attempt_count-1),available_at=now()+interval '1 hour',locked_at=null,locked_by=null,updated_at=now() where id=p_job and locked_by=p_worker and status='running';
 else
  update interview_processing_jobs set status='queued',attempt_count=greatest(0,attempt_count-1),available_at=now()+interval '1 hour',locked_at=null,locked_by=null,updated_at=now() where id=p_job and locked_by=p_worker and status='running';
 end if;return found;
end $$;
revoke all on function public.defer_interview_trial_job(uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.defer_interview_trial_job(uuid,text,boolean) to service_role;

commit;
