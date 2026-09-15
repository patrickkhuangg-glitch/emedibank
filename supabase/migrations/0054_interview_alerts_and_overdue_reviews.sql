-- One whole panel is one review; its ten member attempts must not inflate the count.
create view public.interview_overdue_reviews with(security_invoker=true) as
 select a.id,'attempt'::text kind,a.station_title title,a.marking_status status,a.submitted_for_marking_at submitted_at,a.video_deleted_at is null and a.recording_expires_at<=now() recording_protected
 from public.interview_attempts a where a.marking_status in ('queued','processing','awaiting_review','in_review','needs_attention') and a.submitted_for_marking_at<now()-interval '7 days'
 and not exists(select 1 from public.interview_mock_marking_members x where x.attempt_id=a.id)
 union all
 select m.id,'panel','Full panel interview',m.status,m.created_at,
 exists(select 1 from public.interview_mock_marking_members x join public.interview_attempts a on a.id=x.attempt_id where x.marking_id=m.id and a.video_deleted_at is null and a.recording_expires_at<=now())
 from public.interview_mock_markings m where m.status not in ('released','ungradable') and m.created_at<now()-interval '7 days';
revoke all on public.interview_overdue_reviews from public,anon,authenticated;
grant select on public.interview_overdue_reviews to service_role;
create table public.interview_alert_deliveries (
 id uuid primary key default gen_random_uuid(),code text not null,episode_at timestamptz not null,
 kind text not null check(kind in ('opened','reminder','resolved')),created_at timestamptz not null default now(),
 status text not null default 'pending' check(status in ('pending','sending','sent','dead','superseded')),
 attempts integer not null default 0,available_at timestamptz not null default now(),locked_until timestamptz,worker uuid,sent_at timestamptz,last_error text
);
create index interview_alert_pending on public.interview_alert_deliveries(status,available_at);
alter table public.interview_alert_deliveries enable row level security;
revoke all on public.interview_alert_deliveries from public,anon,authenticated;
grant all on public.interview_alert_deliveries to service_role;
-- Keep the existing operational checks intact, extending their output.
alter function public.check_interview_operations() rename to check_interview_operations_base;
create function public.check_interview_operations() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb;n integer;oldest integer;i record;
begin
 perform pg_advisory_xact_lock(76124,4);
 -- The base function resolves codes outside its own set; preserve the overdue episode.
 select * into i from interview_operation_incidents where code='review_overdue';
 result:=check_interview_operations_base();
 select count(*)::int,coalesce(extract(epoch from now()-min(submitted_at))::integer,0) into n,oldest from interview_overdue_reviews;
 if n>0 then
  insert into interview_operation_incidents(code,first_seen_at,last_seen_at) values('review_overdue',now(),now())
  on conflict(code) do update set first_seen_at=case when i.resolved_at is null and i.first_seen_at is not null then i.first_seen_at else now() end,last_seen_at=now(),resolved_at=null;
  result:=jsonb_set(result,'{issues}',(result->'issues')||'"review_overdue"'::jsonb);
 end if;
 result:=jsonb_set(result,'{metrics}',(result->'metrics')||jsonb_build_object('overdue_reviews',n,'oldest_review_seconds',oldest));
 update interview_operation_health set metrics=result->'metrics',issues=result->'issues' where singleton;
 for i in select * from interview_operation_incidents loop
  if i.resolved_at is null then
   if not exists(select 1 from interview_alert_deliveries where code=i.code and episode_at=i.first_seen_at) then
    insert into interview_alert_deliveries(code,episode_at,kind) values(i.code,i.first_seen_at,'opened');
   elsif not exists(select 1 from interview_alert_deliveries where code=i.code and episode_at=i.first_seen_at and (created_at>now()-interval '24 hours' or status in ('pending','sending','dead'))) then
    insert into interview_alert_deliveries(code,episode_at,kind) values(i.code,i.first_seen_at,'reminder');
   end if;
  else
   -- Do not deliver stale problem notifications after recovery.
   update interview_alert_deliveries set status='superseded' where code=i.code and episode_at=i.first_seen_at and kind<>'resolved' and status in ('pending','dead');
   if exists(select 1 from interview_alert_deliveries where code=i.code and episode_at=i.first_seen_at and status in ('sent','sending')) and not exists(select 1 from interview_alert_deliveries where code=i.code and episode_at=i.first_seen_at and kind='resolved') then
    insert into interview_alert_deliveries(code,episode_at,kind) values(i.code,i.first_seen_at,'resolved');
   end if;
  end if;
 end loop;
 delete from interview_alert_deliveries where status in ('sent','superseded') and created_at<now()-interval '90 days';
 return result;
end $$;
create function public.claim_interview_alert(p_worker uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare a interview_alert_deliveries;
begin
 perform pg_advisory_xact_lock(76124,6);
 update interview_alert_deliveries set status=case when attempts>=5 then 'dead' else 'pending' end,locked_until=null,worker=null where status='sending' and locked_until<now();
 -- One sender at a time, even when cron invocations overlap.
 if exists(select 1 from interview_alert_deliveries where status='sending') then return null;end if;
 select * into a from interview_alert_deliveries where status='pending' and available_at<=now() and attempts<5 order by created_at,id limit 1 for update;
 if not found then return null;end if;
 update interview_alert_deliveries set status='sending',attempts=attempts+1,worker=p_worker,locked_until=now()+interval '2 minutes' where id=a.id returning * into a;
 return to_jsonb(a);
end $$;
create function public.finish_interview_alert(p_id uuid,p_worker uuid,p_error text default null) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
 update interview_alert_deliveries set status=case when p_error is null then 'sent' when attempts>=5 then 'dead' else 'pending' end,sent_at=case when p_error is null then now() end,available_at=now()+least(60,power(2,attempts)::integer)*interval '1 minute',last_error=case when p_error is null then null else 'delivery_failed' end,worker=null,locked_until=null where id=p_id and worker=p_worker and status='sending' and locked_until>now();
 return found;
end $$;
create or replace function public.read_interview_operations() returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('checked_at',checked_at,'metrics',metrics,'issues',issues,
 'incidents',coalesce((select jsonb_agg(x) from(select code,first_seen_at,last_seen_at,resolved_at,occurrences from interview_operation_incidents order by last_seen_at desc limit 20)x),'[]'::jsonb),
 'overdue_reviews',coalesce((select jsonb_agg(x) from(select * from interview_overdue_reviews order by submitted_at,id limit 20)x),'[]'::jsonb),
 'alert_delivery',jsonb_build_object('pending',(select count(*) from interview_alert_deliveries where status in ('pending','sending')),'failed',(select count(*) from interview_alert_deliveries where status='dead'),'last_sent_at',(select max(sent_at) from interview_alert_deliveries))) from interview_operation_health where singleton;
$$;
revoke all on function public.check_interview_operations_base(),public.check_interview_operations(),public.claim_interview_alert(uuid),public.finish_interview_alert(uuid,uuid,text),public.read_interview_operations() from public,anon,authenticated;
grant execute on function public.check_interview_operations(),public.claim_interview_alert(uuid),public.finish_interview_alert(uuid,uuid,text),public.read_interview_operations() to service_role;
select public.check_interview_operations();
