-- 0014_essay_planning_sitting.sql — planning notes + exam-simulation grouping.
--
-- `plan` holds the student's planning/scratch notes for an essay (saved with the
-- draft; not part of the marked essay). `sitting_id` groups the two essays a full
-- Section II simulation produces (one Task A + one Task B under a shared clock),
-- so the list can show them as one exam.

alter table public.essay_responses
  add column if not exists plan text,
  add column if not exists sitting_id uuid;

create index if not exists essay_responses_sitting_idx on public.essay_responses (sitting_id);
