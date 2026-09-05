-- 0029 — Private Google Calendar connections for tutoring hosts.

create table public.google_calendar_connections (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  refresh_token text not null,
  calendar_id   text not null default 'primary',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.google_calendar_connections enable row level security;

comment on table public.google_calendar_connections is
  'OAuth refresh tokens for admin-owned Google Calendars. Access is server-only; no browser policy is granted.';
