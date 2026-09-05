-- 0032 — Student-owned exam dates and a universal study-plan checklist.

create table public.study_plan_exam_dates (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  exam_id     uuid not null references public.exams (id) on delete cascade,
  label       text not null default 'Exam day' check (char_length(label) between 1 and 80),
  exam_date   date not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, exam_id, label)
);

create index study_plan_exam_dates_user_date_idx
  on public.study_plan_exam_dates (user_id, exam_date);

create table public.study_plan_tasks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  exam_id      uuid references public.exams (id) on delete cascade,
  body         text not null check (char_length(body) between 1 and 240),
  is_completed boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index study_plan_tasks_user_status_idx
  on public.study_plan_tasks (user_id, is_completed, created_at desc);

alter table public.study_plan_exam_dates enable row level security;
alter table public.study_plan_tasks enable row level security;

create policy "Students manage their own exam dates"
  on public.study_plan_exam_dates for all
  using (auth.uid() = user_id or public.is_admin(auth.uid()))
  with check (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "Students manage their own study plan tasks"
  on public.study_plan_tasks for all
  using (auth.uid() = user_id or public.is_admin(auth.uid()))
  with check (auth.uid() = user_id or public.is_admin(auth.uid()));

comment on table public.study_plan_exam_dates is
  'Student-owned exam dates shown together on the universal study plan. Interviews may have multiple labelled dates.';

comment on table public.study_plan_tasks is
  'Persistent account-wide notes and checklist items, optionally scoped to an unlocked exam.';
