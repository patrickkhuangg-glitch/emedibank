create table public.interview_recording_backups (
 id uuid primary key default gen_random_uuid(),
 attempt_id uuid unique references public.interview_attempts(id) on delete set null,
 object_key text unique not null,
 status text not null default 'pending' check(status in ('pending','working','ready','delete','deleted')),
 action text check(action in ('copy','delete')),
 worker uuid,lease_until timestamptz,available_at timestamptz not null default now(),
 created_at timestamptz not null default now(),backed_up_at timestamptz,deleted_at timestamptz,
 bytes bigint,sha256 text,failures integer not null default 0,last_error text
);
create index interview_backup_queue on public.interview_recording_backups(status,available_at);
create table public.interview_backup_health (
 singleton boolean primary key default true check(singleton),enabled boolean not null default false,
 checked_at timestamptz,last_success_at timestamptz,last_error text,sweep_cursor text
);
insert into public.interview_backup_health(singleton) values(true);
alter table public.interview_recording_backups enable row level security;
alter table public.interview_backup_health enable row level security;
revoke all on public.interview_recording_backups,public.interview_backup_health from public,anon,authenticated;
grant all on public.interview_recording_backups,public.interview_backup_health to service_role;

-- The database remains authoritative for retention. An expired ordinary backup is
-- never restored; pending marking has the same exception as primary storage.
create function public.interview_backup_eligible(p_attempt uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from interview_attempts a where a.id=p_attempt and a.upload_status='ready' and a.video_deleted_at is null
 and a.recording_expires_at is not null
 and (a.recording_expires_at>now() or a.marking_status in ('queued','processing','awaiting_review','in_review','needs_attention')));
$$;
create function public.claim_interview_backup(p_worker uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare claimed_backup interview_recording_backups;source_attempt interview_attempts;
begin
 perform pg_advisory_xact_lock(76124,7);
 if not (select enabled from interview_backup_health where singleton) then return null;end if;
 update interview_recording_backups set status=case when action='delete' then 'delete' else 'pending' end,worker=null,lease_until=null
 where status='working' and lease_until<now();
 if (select count(*) from interview_recording_backups where status='working')>=2 then return null;end if;
 insert into interview_recording_backups(attempt_id,object_key)
 select a.id,'recordings/'||a.id::text from interview_attempts a
 where a.upload_status='ready' and a.video_deleted_at is null and interview_backup_eligible(a.id)
 and not exists(select 1 from interview_recording_backups b where b.attempt_id=a.id)
 order by a.created_at,a.id limit 100 on conflict(attempt_id) do nothing;
 -- Keep tombstones until R2 confirms deletion, even if the account was removed.
 update interview_recording_backups set status='delete',available_at=now()
 where status in ('pending','ready') and not interview_backup_eligible(attempt_id);
 select * into claimed_backup from interview_recording_backups where status in ('pending','delete') and available_at<=now()
 order by (status='delete') desc,available_at,created_at,id limit 1 for update;
 if not found then return null;end if;
 update interview_recording_backups set action=case when status='delete' then 'delete' else 'copy' end,status='working',worker=p_worker,lease_until=now()+interval '5 minutes'
 where id=claimed_backup.id returning * into claimed_backup;
 select * into source_attempt from interview_attempts where id=claimed_backup.attempt_id;
 return jsonb_build_object('id',claimed_backup.id,'attempt_id',claimed_backup.attempt_id,'object_key',claimed_backup.object_key,'action',claimed_backup.action,'recording_path',source_attempt.recording_path,'mime_type',source_attempt.recording_mime_type);
end $$;
create function public.finish_interview_backup(p_id uuid,p_worker uuid,p_error text default null,p_bytes bigint default null,p_sha256 text default null) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare b interview_recording_backups;
begin
 select * into b from interview_recording_backups where id=p_id and worker=p_worker and status='working' and lease_until>now() for update;
 if not found then return false;end if;
 if p_error is null and b.action='copy' and (p_bytes is null or p_bytes<=0 or p_sha256 is null or p_sha256!~'^[a-f0-9]{64}$') then raise exception 'Invalid backup receipt';end if;
 update interview_recording_backups set
 status=case when p_error is not null then case when b.action='delete' then 'delete' else 'pending' end
 when b.action='delete' then 'deleted' when not interview_backup_eligible(b.attempt_id) then 'delete' else 'ready' end,
 worker=null,lease_until=null,failures=case when p_error is null then 0 else failures+1 end,
 available_at=case when p_error is null then now() else now()+least(30,power(2,least(failures,5))::int)*interval '1 minute' end,
 last_error=case when p_error is not null then 'backup_operation_failed' end,
 backed_up_at=case when p_error is null and b.action='copy' then now() else backed_up_at end,
 deleted_at=case when p_error is null and b.action='delete' then now() else deleted_at end,
 bytes=case when p_error is null and b.action='copy' then p_bytes else bytes end,
 sha256=case when p_error is null and b.action='copy' then p_sha256 else sha256 end
 where id=p_id;
 return true;
end $$;
revoke all on function public.interview_backup_eligible(uuid),public.claim_interview_backup(uuid),public.finish_interview_backup(uuid,uuid,text,bigint,text) from public,anon,authenticated;
grant execute on function public.interview_backup_eligible(uuid),public.claim_interview_backup(uuid),public.finish_interview_backup(uuid,uuid,text,bigint,text) to service_role;

create function public.reconcile_interview_backup(p_attempt uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform pg_advisory_xact_lock(76124,7);
 if interview_backup_eligible(p_attempt) then return;end if;
 insert into interview_recording_backups(object_key,status,action)
 values('recordings/'||p_attempt::text,'delete','delete')
 on conflict(object_key) do update set status='delete',available_at=now()
 where interview_recording_backups.status='deleted';
end $$;
revoke all on function public.reconcile_interview_backup(uuid) from public,anon,authenticated;
grant execute on function public.reconcile_interview_backup(uuid) to service_role;

-- Extend the existing monitor so backup incidents use its deduplicated email
-- delivery and recovery notifications, independently of the backup cron.
alter function public.check_interview_operations_base() rename to check_interview_operations_without_backups;
create function public.check_interview_operations_base() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb; prior interview_operation_incidents;h interview_backup_health;pending integer;deletions integer;oldest timestamptz;issue boolean:=false;
begin
 select * into prior from interview_operation_incidents where code='recording_backups';
 result:=check_interview_operations_without_backups();
 select * into h from interview_backup_health where singleton;
 select count(*)::int,min(created_at) into pending,oldest from interview_recording_backups where status in ('pending','working') and action is distinct from 'delete';
 select count(*)::int into deletions from interview_recording_backups where status<>'deleted' and not interview_backup_eligible(attempt_id);
 if h.enabled then
  issue:=h.last_success_at is null or h.last_success_at<now()-interval '15 minutes' or h.last_error is not null
   or oldest<now()-interval '30 minutes' or exists(select 1 from interview_recording_backups where status<>'deleted' and failures>=3)
   or exists(select 1 from interview_recording_backups where status='delete' and available_at<now()-interval '15 minutes');
 end if;
 if issue then
  insert into interview_operation_incidents(code,first_seen_at,last_seen_at) values('recording_backups',now(),now())
  on conflict(code) do update set first_seen_at=case when prior.resolved_at is null and prior.first_seen_at is not null then prior.first_seen_at else now() end,last_seen_at=now(),resolved_at=null;
  result:=jsonb_set(result,'{issues}',(result->'issues')||'"recording_backups"'::jsonb);
 end if;
 result:=jsonb_set(result,'{metrics}',(result->'metrics')||jsonb_build_object('backup_enabled',h.enabled,'backup_pending',pending,'backup_deletions',deletions,'backup_last_success',h.last_success_at));
 return result;
end $$;
revoke all on function public.check_interview_operations_without_backups(),public.check_interview_operations_base() from public,anon,authenticated,service_role;
