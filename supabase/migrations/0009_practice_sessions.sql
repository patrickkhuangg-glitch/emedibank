-- 0009 — Practice session history.
--
-- Records one summary row each time a user finishes a practice session in the
-- runner (mock exams use a separate runner and are intentionally excluded).
-- This powers the "History" tab on the practice page. Individual answers still
-- live in question_attempts; this is just the per-session roll-up.

create table public.practice_sessions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  exam_id            uuid not null references public.exams (id) on delete cascade,
  subtest_id         uuid references public.subtests (id) on delete set null,
  tag                text,                       -- category, null = whole section
  mode               text not null default 'sets', -- 'sets' | 'timed' | 'review'
  total              integer not null,           -- questions answered
  correct            integer not null,
  time_spent_seconds integer,
  created_at         timestamptz not null default now()
);

create index practice_sessions_user_exam_idx
  on public.practice_sessions (user_id, exam_id, created_at desc);

comment on table public.practice_sessions is
  'Per-session roll-up for the practice history tab. Users own only their rows.';

alter table public.practice_sessions enable row level security;

-- A user may read and create only their own session rows.
create policy "Own practice sessions are readable"
  on public.practice_sessions for select
  using (auth.uid() = user_id);

create policy "Users insert their own practice sessions"
  on public.practice_sessions for insert
  with check (auth.uid() = user_id);
