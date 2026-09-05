-- Assign every tutoring lesson to a specific tutor. Existing lessons remain
-- attached to the account that originally created them.
alter table public.tutoring_sessions
  add column if not exists tutor_id uuid references auth.users(id) on delete set null;

update public.tutoring_sessions
set tutor_id = created_by
where tutor_id is null;

create index if not exists tutoring_sessions_tutor_id_scheduled_for_idx
  on public.tutoring_sessions (tutor_id, scheduled_for);

comment on column public.tutoring_sessions.tutor_id is
  'The staff member assigned to deliver this lesson; distinct from the admin who scheduled it.';
