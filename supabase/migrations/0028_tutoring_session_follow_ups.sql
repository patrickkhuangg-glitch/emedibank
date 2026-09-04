-- 0028 — Tutor follow-up content shared with the student from Bookings.

alter table public.tutoring_sessions
  add column if not exists tutor_notes text,
  add column if not exists homework text;

comment on column public.tutoring_sessions.tutor_notes is
  'Tutor-written lesson notes that the student can view from Bookings.';
comment on column public.tutoring_sessions.homework is
  'Next steps or homework from the lesson, shared with the student from Bookings.';
