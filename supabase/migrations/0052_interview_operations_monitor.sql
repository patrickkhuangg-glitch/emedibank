create table public.interview_operation_runs (
 id uuid primary key,operation text not null check(operation in ('processing','cleanup')),started_at timestamptz not null default now(),finished_at timestamptz,outcome text check(outcome in ('ok','failed')),processed integer not null default 0
);
create index interview_operation_recent on public.interview_operation_runs(operation,started_at desc);
create table public.interview_operation_health (singleton boolean primary key default true check(singleton),checked_at timestamptz not null,metrics jsonb not null,issues jsonb not null);
create table public.interview_operation_incidents (code text primary key,first_seen_at timestamptz not null,last_seen_at timestamptz not null,resolved_at timestamptz,occurrences integer not null default 1);
alter table public.interview_operation_runs enable row level security;
alter table public.interview_operation_health enable row level security;
alter table public.interview_operation_incidents enable row level security;
revoke all on public.interview_operation_runs,public.interview_operation_health,public.interview_operation_incidents from public,anon,authenticated;
grant all on public.interview_operation_runs,public.interview_operation_health,public.interview_operation_incidents to service_role;
create function public.record_interview_operation(p_id uuid,p_operation text,p_outcome text default null,p_processed integer default 0) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if p_operation not in ('processing','cleanup') or (p_outcome is not null and p_outcome not in ('ok','failed')) then raise exception 'Invalid operation';end if;
 insert into public.interview_operation_runs(id,operation,finished_at,outcome,processed) values(p_id,p_operation,case when p_outcome is not null then now() end,p_outcome,greatest(0,p_processed))
 on conflict(id) do update set finished_at=case when p_outcome is not null then now() end,outcome=p_outcome,processed=greatest(0,p_processed) where interview_operation_runs.operation=p_operation and interview_operation_runs.finished_at is null;
end $$;
create function public.check_interview_operations() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare m jsonb;issues text[]:='{}';issue_code text;result jsonb;
begin
 perform pg_advisory_xact_lock(76124,4);
 with jobs as (
  select q.id,q.job_type,q.status,q.available_at,q.locked_at,q.updated_at,a.user_id,q.attempt_count,q.max_attempts from public.interview_processing_jobs q join public.interview_attempts a on a.id=q.attempt_id
  union all select q.id,q.job_type,q.status,q.available_at,q.locked_at,q.updated_at,a.user_id,q.attempt_count,q.max_attempts from public.interview_mock_processing_jobs q join public.interview_mock_markings a on a.id=q.marking_id
 ), due as (
  select a.* from public.interview_attempts a where a.video_deleted_at is null and (
   (a.upload_status='ready' and a.recording_expires_at<=now() and (a.marking_status is null or a.marking_status in ('released','ungradable')))
   or (a.upload_status='discarded' and exists(select 1 from public.interview_processing_jobs j where j.attempt_id=a.id and j.job_type='cleanup'))
  )
 ) select jsonb_build_object(
  'ready_jobs',(select count(*) from jobs where job_type<>'cleanup' and status in ('queued','failed') and available_at<=now() and attempt_count<max_attempts),
  'oldest_ready_seconds',coalesce((select extract(epoch from now()-min(available_at))::integer from jobs where job_type<>'cleanup' and status in ('queued','failed') and available_at<=now() and attempt_count<max_attempts),0),
  'running_jobs',(select count(*) from jobs where job_type<>'cleanup' and status='running' and locked_at>=now()-interval '10 minutes'),
  'max_student_running',coalesce((select max(n) from(select count(*) n from jobs where job_type<>'cleanup' and status='running' and locked_at>=now()-interval '10 minutes' group by user_id)x),0),
  'stale_leases',(select count(*) from jobs where status='running' and locked_at<now()-interval '10 minutes'),
  'dead_jobs',(select count(*) from jobs where status='dead' and (job_type='cleanup' or attempt_count>=max_attempts)),
  'failed_last_hour',(select count(*) from jobs where status in ('failed','dead') and updated_at>now()-interval '1 hour' and attempt_count>0),
  'cleanup_due',(select count(*) from due),
  'oldest_cleanup_seconds',coalesce((select greatest(0,extract(epoch from now()-min(coalesce(recording_expires_at,created_at+interval '24 hours'))))::integer from due),0),
  'protected_overdue',(select count(*) from interview_attempts where video_deleted_at is null and recording_expires_at<=now() and marking_status in ('queued','processing','awaiting_review','in_review','needs_attention')),
  'processing_last_success',(select max(finished_at) from interview_operation_runs where operation='processing' and outcome='ok'),
  'cleanup_last_success',(select max(finished_at) from interview_operation_runs where operation='cleanup' and outcome='ok'),
  'recent_operation_failures',(select count(*) from interview_operation_runs where (outcome='failed' or (finished_at is null and started_at<now()-interval '5 minutes')) and started_at>now()-interval '15 minutes')
 ) into m;
 if (m->>'oldest_ready_seconds')::int>900 then issues:=array_append(issues,'queue_delay');end if;
 if (m->>'ready_jobs')::int>0 and (m->>'oldest_ready_seconds')::int>300 and ((m->>'processing_last_success') is null or (m->>'processing_last_success')::timestamptz<now()-interval '5 minutes') then issues:=array_append(issues,'processing_stalled');end if;
 if (m->>'stale_leases')::int>0 then issues:=array_append(issues,'stale_workers');end if;
 if (m->>'dead_jobs')::int>0 then issues:=array_append(issues,'jobs_need_attention');end if;
 if (m->>'failed_last_hour')::int>=5 then issues:=array_append(issues,'repeated_job_failures');end if;
 if (m->>'cleanup_due')::int>0 and (m->>'oldest_cleanup_seconds')::int>900 then issues:=array_append(issues,'cleanup_overdue');end if;
 if (m->>'recent_operation_failures')::int>0 then issues:=array_append(issues,'operation_failed');end if;
 if (m->>'running_jobs')::int>4 or (m->>'max_student_running')::int>2 then issues:=array_append(issues,'worker_bound_exceeded');end if;
 foreach issue_code in array issues loop
  insert into interview_operation_incidents(code,first_seen_at,last_seen_at) values(issue_code,now(),now())
  on conflict(code) do update set first_seen_at=case when interview_operation_incidents.resolved_at is null then interview_operation_incidents.first_seen_at else now() end,last_seen_at=now(),resolved_at=null,occurrences=interview_operation_incidents.occurrences+1;
 end loop;
 update interview_operation_incidents set resolved_at=now() where resolved_at is null and not(code=any(issues));
 insert into interview_operation_health(singleton,checked_at,metrics,issues) values(true,now(),m,to_jsonb(issues)) on conflict(singleton) do update set checked_at=excluded.checked_at,metrics=excluded.metrics,issues=excluded.issues;
 delete from interview_operation_runs where started_at<now()-interval '30 days';
 result:=jsonb_build_object('checked_at',now(),'metrics',m,'issues',to_jsonb(issues));
 return result;
end $$;
create function public.read_interview_operations() returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('checked_at',checked_at,'metrics',metrics,'issues',issues,'incidents',coalesce((select jsonb_agg(x) from (select code,first_seen_at,last_seen_at,resolved_at,occurrences from interview_operation_incidents order by last_seen_at desc limit 20)x),'[]'::jsonb)) from interview_operation_health where singleton;
$$;
revoke all on function public.record_interview_operation(uuid,text,text,integer),public.check_interview_operations(),public.read_interview_operations() from public,anon,authenticated;
grant execute on function public.record_interview_operation(uuid,text,text,integer),public.check_interview_operations(),public.read_interview_operations() to service_role;
select public.check_interview_operations();
