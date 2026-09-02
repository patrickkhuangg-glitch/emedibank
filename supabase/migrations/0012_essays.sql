-- 0012_essays.sql — GAMSAT Section II (Written Communication) essay writing.
--
-- Section II has no multiple-choice questions. A student is shown a THEME with a
-- set of quotes/comments and writes an extended response, saved under TIMED or
-- UNTIMED conditions. Two tables:
--   essay_prompts   — the stimulus (theme + quotes), admin-authored, like `stimuli`
--   essay_responses — each student's saved writing (drafts + submitted, timed +
--                     untimed alike). The essay itself lives in `body`.

create table public.essay_prompts (
  id                uuid primary key default gen_random_uuid(),
  subtest_id        uuid not null references public.subtests (id) on delete cascade,
  task              text not null default 'A',          -- 'A' (argument) | 'B' (reflective)
  theme             text not null,                       -- e.g. "On authority and power"
  instructions      text not null default 'Consider the following comments and develop a piece of writing in response to one or more of them. Your writing will be assessed on the quality of the thinking and the control of language.',
  quotes            jsonb not null default '[]'::jsonb,  -- [{ "text": "...", "author": "..." }, ...]
  suggested_minutes integer not null default 30,
  is_free           boolean not null default false,
  published         boolean not null default false,
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now()
);
create index essay_prompts_subtest_idx on public.essay_prompts (subtest_id, sort_order);

alter table public.essay_prompts enable row level security;
-- Any signed-in user may read PUBLISHED prompts (the paywall is enforced in the
-- page layer via the access module); admins manage everything.
create policy "Published essay prompts are readable"
  on public.essay_prompts for select
  using (published or public.is_admin(auth.uid()));
create policy "Admins manage essay prompts"
  on public.essay_prompts for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create table public.essay_responses (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  prompt_id          uuid not null references public.essay_prompts (id) on delete cascade,
  body               text not null default '',
  word_count         integer not null default 0,
  timed              boolean not null default false,
  duration_minutes   integer,                            -- timer length when timed; null = untimed
  time_spent_seconds integer not null default 0,
  status             text not null default 'draft',      -- 'draft' | 'submitted'
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index essay_responses_user_idx
  on public.essay_responses (user_id, prompt_id, updated_at desc);

alter table public.essay_responses enable row level security;
create policy "Own essay responses are readable"
  on public.essay_responses for select using (auth.uid() = user_id);
create policy "Users insert their own essay responses"
  on public.essay_responses for insert with check (auth.uid() = user_id);
create policy "Users update their own essay responses"
  on public.essay_responses for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete their own essay responses"
  on public.essay_responses for delete using (auth.uid() = user_id);

comment on table public.essay_prompts is
  'GAMSAT Section II essay stimulus: a theme + quotes the student responds to.';
comment on table public.essay_responses is
  'A student''s saved essay for a prompt — draft or submitted, timed or untimed.';
