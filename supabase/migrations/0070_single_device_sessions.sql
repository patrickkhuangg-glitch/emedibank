begin;

create table public.account_active_sessions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  session_id uuid not null,
  claimed_at timestamptz not null default now()
);

alter table public.account_active_sessions enable row level security;
revoke all on public.account_active_sessions from public, anon, authenticated;

-- This server-managed configuration table predates the current explicit-RLS
-- baseline. It contains no student data, but still follows the same deny-by-default rule.
alter table public.interview_progression_settings enable row level security;

create function public.claim_single_device_session() returns boolean
language plpgsql security definer set search_path='' as $$
declare
  actor uuid := auth.uid();
  current_session uuid;
begin
  if actor is null then return false; end if;
  begin
    current_session := nullif(auth.jwt()->>'session_id', '')::uuid;
  exception when invalid_text_representation then
    return false;
  end;
  if current_session is null then return false; end if;

  insert into public.account_active_sessions(user_id, session_id, claimed_at)
  values(actor, current_session, now())
  on conflict(user_id) do update
    set session_id=excluded.session_id, claimed_at=excluded.claimed_at;
  return true;
end $$;

create function public.is_current_device_session() returns boolean
language plpgsql security definer set search_path='' as $$
declare
  actor uuid := auth.uid();
  current_session uuid;
begin
  if actor is null then return false; end if;
  begin
    current_session := nullif(auth.jwt()->>'session_id', '')::uuid;
  exception when invalid_text_representation then
    return false;
  end;
  if current_session is null then return false; end if;

  -- Adopt one pre-release session only when no active session has been recorded.
  insert into public.account_active_sessions(user_id, session_id, claimed_at)
  values(actor, current_session, now())
  on conflict(user_id) do nothing;

  return exists(
    select 1 from public.account_active_sessions
    where user_id=actor and session_id=current_session
  );
end $$;

revoke all on function public.claim_single_device_session(), public.is_current_device_session() from public, anon;
grant execute on function public.claim_single_device_session(), public.is_current_device_session() to authenticated;

commit;
