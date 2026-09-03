-- 0016 — Exact post-session review snapshots.
-- Stores the randomized question order and the student's submitted responses
-- alongside each existing practice-session summary. Existing rows remain valid
-- summary-only history entries.

alter table public.practice_sessions
  add column if not exists question_ids uuid[] not null default '{}',
  add column if not exists responses jsonb not null default '[]'::jsonb;

comment on column public.practice_sessions.question_ids is
  'Question IDs in the exact randomized order shown during this session.';
comment on column public.practice_sessions.responses is
  'Submitted response and awarded score for each question; answer keys remain server-side.';
