-- 0005_question_bank.sql — Phase 2: question bank + video explanations.
--
-- Questions hang off a subtest (→ exam). MCQ (single_best_answer) is built first;
-- `kind` + `data` (jsonb) keep the model open to other formats. Video explanations
-- live on the question (Mux) and are gated for all (paid). Every attempt is recorded
-- as the analytics foundation.
--
-- SECURITY: correct answers + explanations must not leak before a student answers,
-- so questions/options are NOT publicly readable — the app serves sanitized content
-- and grades server-side with the service role. RLS here is the backstop: admins
-- manage content; users own only their attempts.

create type public.question_kind as enum ('single_best_answer');
create type public.video_status as enum ('none', 'processing', 'ready');

create table public.questions (
  id                     uuid primary key default gen_random_uuid(),
  subtest_id             uuid not null references public.subtests (id) on delete cascade,
  topic                  text,
  kind                   public.question_kind not null default 'single_best_answer',
  stem                   text not null,
  data                   jsonb,          -- type-specific payload for non-MCQ formats
  explanation_text       text,
  difficulty             text check (difficulty in ('easy', 'medium', 'hard')),
  sort_order             integer not null default 0,
  published              boolean not null default false,
  mux_asset_id           text,
  mux_playback_id        text,
  video_status           public.video_status not null default 'none',
  video_duration_seconds integer,
  created_at             timestamptz not null default now()
);
create index questions_subtest_idx on public.questions (subtest_id);

create table public.question_options (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  label       text not null,
  body        text not null,
  is_correct  boolean not null default false,
  sort_order  integer not null default 0,
  unique (question_id, label)
);
create index question_options_question_idx on public.question_options (question_id);

create table public.question_attempts (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  question_id        uuid not null references public.questions (id) on delete cascade,
  subtest_id         uuid not null references public.subtests (id) on delete cascade,
  exam_id            uuid not null references public.exams (id) on delete cascade,
  selected_option_id uuid references public.question_options (id) on delete set null,
  response           jsonb,
  is_correct         boolean not null,
  time_spent_seconds integer,
  answered_at        timestamptz not null default now()
);
create index question_attempts_user_idx on public.question_attempts (user_id);
create index question_attempts_user_subtest_idx on public.question_attempts (user_id, subtest_id);

comment on table public.questions is
  'Question bank. Answers/explanations served server-side only; RLS is admin-managed.';
comment on table public.question_attempts is
  'Every attempt — the analytics foundation. Users own only their own rows.';

-- RLS
alter table public.questions        enable row level security;
alter table public.question_options enable row level security;
alter table public.question_attempts enable row level security;

-- Content is admin-managed; student access is mediated by the server (service role).
create policy "Admins manage questions"
  on public.questions for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "Admins manage question options"
  on public.question_options for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Attempts: a user reads/writes only their own.
create policy "Users manage their own attempts"
  on public.question_attempts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
