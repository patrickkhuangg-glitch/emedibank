-- 0030 — Track external calendar events and tutoring session cancellations.

alter table public.tutoring_sessions
  add column google_calendar_event_id text,
  add column cancelled_at timestamptz,
  add column cancelled_by uuid references auth.users (id) on delete set null;

comment on column public.tutoring_sessions.google_calendar_event_id is
  'Google Calendar event ID used to remove the host event when a lesson is cancelled.';
comment on column public.tutoring_sessions.cancelled_at is
  'When the lesson was cancelled. Cancelled lessons never consume package time.';
comment on column public.tutoring_sessions.cancelled_by is
  'The admin or student account that cancelled the lesson.';
