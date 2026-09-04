-- 0022 — Private, persistent reminders for interview practice.

create table public.interview_study_notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 280),
  created_at  timestamptz not null default now()
);

create index interview_study_notes_user_created_idx
  on public.interview_study_notes (user_id, created_at desc);

alter table public.interview_study_notes enable row level security;

create policy "Users read their own interview study notes"
  on public.interview_study_notes for select
  using (auth.uid() = user_id);

create policy "Users add their own interview study notes"
  on public.interview_study_notes for insert
  with check (auth.uid() = user_id);

comment on table public.interview_study_notes is
  'Private study reminders saved by students while preparing for interviews.';
