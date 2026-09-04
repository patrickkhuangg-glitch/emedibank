-- 0027 — Zoom-backed tutoring sessions with protected package deductions.

create type public.tutoring_session_status as enum (
  'scheduled',
  'completed',
  'needs_review',
  'cancelled'
);

create table public.tutoring_sessions (
  id                    uuid primary key default gen_random_uuid(),
  plan_id               uuid not null references public.study_plans (id) on delete cascade,
  plan_item_id          uuid not null references public.study_plan_items (id) on delete restrict,
  student_id            uuid not null references auth.users (id) on delete cascade,
  student_email         text not null,
  title                 text not null check (char_length(title) between 1 and 160),
  scheduled_for         timestamptz not null,
  booked_minutes        integer not null check (booked_minutes between 15 and 480 and booked_minutes % 15 = 0),
  zoom_meeting_id       text not null unique,
  zoom_meeting_uuid     text,
  zoom_join_url         text not null,
  -- Never selected directly by students: this URL permits hosting the meeting.
  zoom_start_url        text not null,
  status                public.tutoring_session_status not null default 'scheduled',
  actual_minutes        integer check (actual_minutes is null or actual_minutes >= 0),
  overrun_minutes       integer not null default 0 check (overrun_minutes >= 0),
  base_deducted_at      timestamptz,
  overrun_deducted_at   timestamptz,
  completed_at          timestamptz,
  created_by            uuid references auth.users (id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index tutoring_sessions_student_time_idx
  on public.tutoring_sessions (student_id, scheduled_for desc);
create index tutoring_sessions_plan_time_idx
  on public.tutoring_sessions (plan_id, scheduled_for desc);
create index tutoring_sessions_review_idx
  on public.tutoring_sessions (status, scheduled_for desc)
  where status = 'needs_review';

-- Sessions are served through trusted server routes so the student's join URL
-- can be exposed without ever exposing the corresponding host start URL.
alter table public.tutoring_sessions enable row level security;

create policy "Admins manage tutoring sessions"
  on public.tutoring_sessions for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create or replace function public.complete_tutoring_session(
  p_session_id uuid,
  p_actual_minutes integer,
  p_student_attended boolean
)
returns public.tutoring_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  session_row public.tutoring_sessions;
  item_row public.study_plan_items;
  booked_hours numeric(7,2);
begin
  select * into session_row
  from public.tutoring_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'Tutoring session not found.';
  end if;
  if session_row.status = 'cancelled' or session_row.base_deducted_at is not null then
    return session_row;
  end if;

  update public.tutoring_sessions
  set
    actual_minutes = greatest(coalesce(p_actual_minutes, 0), 0),
    overrun_minutes = greatest(coalesce(p_actual_minutes, 0) - session_row.booked_minutes, 0),
    status = 'needs_review',
    completed_at = now(),
    updated_at = now()
  where id = session_row.id
  returning * into session_row;

  -- A missing student attendance record must be explicitly approved by an
  -- admin; it never consumes hours merely because the Zoom room was open.
  if not p_student_attended then
    return session_row;
  end if;

  select * into item_row
  from public.study_plan_items
  where id = session_row.plan_item_id
  for update;

  booked_hours := session_row.booked_minutes::numeric / 60;
  if item_row.used_units + booked_hours > item_row.total_units then
    raise exception 'There are not enough tutoring hours remaining for this session.';
  end if;

  update public.study_plan_items
  set used_units = used_units + booked_hours, updated_at = now()
  where id = item_row.id;

  update public.tutoring_sessions
  set
    base_deducted_at = now(),
    status = case when overrun_minutes > 0 then 'needs_review' else 'completed' end,
    updated_at = now()
  where id = session_row.id
  returning * into session_row;

  return session_row;
end;
$$;

create or replace function public.approve_tutoring_overrun(p_session_id uuid)
returns public.tutoring_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  session_row public.tutoring_sessions;
  item_row public.study_plan_items;
  overrun_hours numeric(7,2);
begin
  select * into session_row
  from public.tutoring_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'Tutoring session not found.';
  end if;
  if session_row.base_deducted_at is null then
    raise exception 'Confirm the booked session before approving an overrun.';
  end if;
  if session_row.overrun_minutes = 0 or session_row.overrun_deducted_at is not null then
    return session_row;
  end if;

  select * into item_row
  from public.study_plan_items
  where id = session_row.plan_item_id
  for update;

  overrun_hours := session_row.overrun_minutes::numeric / 60;
  if item_row.used_units + overrun_hours > item_row.total_units then
    raise exception 'There are not enough tutoring hours remaining for this overrun.';
  end if;

  update public.study_plan_items
  set used_units = used_units + overrun_hours, updated_at = now()
  where id = item_row.id;

  update public.tutoring_sessions
  set status = 'completed', overrun_deducted_at = now(), updated_at = now()
  where id = session_row.id
  returning * into session_row;

  return session_row;
end;
$$;

revoke all on function public.complete_tutoring_session(uuid, integer, boolean) from public;
revoke all on function public.approve_tutoring_overrun(uuid) from public;
grant execute on function public.complete_tutoring_session(uuid, integer, boolean) to service_role;
grant execute on function public.approve_tutoring_overrun(uuid) to service_role;

comment on table public.tutoring_sessions is
  'Zoom tutoring sessions. Booked time is charged on verified student attendance; overruns need an admin approval.';
