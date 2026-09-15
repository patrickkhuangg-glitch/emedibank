-- Cooperative admission for current clients; this does not replace storage RLS.
create table public.interview_upload_slots (
 id uuid primary key,user_id uuid not null references auth.users(id) on delete cascade,
 attempt_id uuid not null references public.interview_attempts(id) on delete cascade,
 requested_at timestamptz not null default clock_timestamp(),last_seen_at timestamptz not null default now(),
 lease_until timestamptz
);
create index interview_upload_slot_queue on public.interview_upload_slots(requested_at,id);
alter table public.interview_upload_slots enable row level security;
revoke all on public.interview_upload_slots from public,anon,authenticated;
grant all on public.interview_upload_slots to service_role;
create function public.interview_upload_slot(p_id uuid,p_user uuid,p_attempt uuid,p_action text default 'acquire') returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
declare candidate uuid;
begin
 perform pg_advisory_xact_lock(76124,5);
 if p_action not in ('acquire','renew','release') then raise exception 'Invalid action';end if;
 if not exists(select 1 from interview_attempts where id=p_attempt and user_id=p_user) then raise exception 'Not owned';end if;
 if p_action='release' then delete from interview_upload_slots where id=p_id and user_id=p_user and attempt_id=p_attempt;return true;end if;
 delete from interview_upload_slots where (lease_until is not null and lease_until<=now()) or (lease_until is null and last_seen_at<now()-interval '2 minutes');
 if p_action='renew' then
  update interview_upload_slots set lease_until=now()+interval '2 minutes',last_seen_at=now() where id=p_id and user_id=p_user and attempt_id=p_attempt and lease_until>now();
  return found;
 end if;
 -- Bound abandoned/multiple-tab requests per account without imposing a usage allowance.
 if not exists(select 1 from interview_upload_slots where id=p_id) and (select count(*) from interview_upload_slots where user_id=p_user)>=2 then return false;end if;
 insert into interview_upload_slots(id,user_id,attempt_id) values(p_id,p_user,p_attempt) on conflict(id) do update set last_seen_at=now() where interview_upload_slots.user_id=p_user and interview_upload_slots.attempt_id=p_attempt;
 -- Admit oldest eligible requests, at most eight transfers and one per student.
 while (select count(*) from interview_upload_slots where lease_until>now())<8 loop
  select s.id into candidate from interview_upload_slots s where s.lease_until is null and not exists(select 1 from interview_upload_slots a where a.user_id=s.user_id and a.lease_until>now()) order by s.requested_at,s.id limit 1;
  exit when candidate is null;
  update interview_upload_slots set lease_until=now()+interval '2 minutes' where id=candidate;
 end loop;
 return exists(select 1 from interview_upload_slots where id=p_id and user_id=p_user and attempt_id=p_attempt and lease_until>now());
end $$;
revoke all on function public.interview_upload_slot(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.interview_upload_slot(uuid,uuid,uuid,text) to service_role;
