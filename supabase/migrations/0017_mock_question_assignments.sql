-- Fixed ordered question lists for standardized mini/full mock forms.
create table if not exists public.mock_question_assignments (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams (id) on delete cascade,
  mock_key text not null,
  subtest_id uuid not null references public.subtests (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  sort_order integer not null check (sort_order > 0),
  created_at timestamptz not null default now(),
  unique (exam_id, mock_key, subtest_id, sort_order),
  unique (exam_id, mock_key, question_id)
);
create index if not exists mock_assignments_form_idx on public.mock_question_assignments (exam_id, mock_key, subtest_id, sort_order);
alter table public.mock_question_assignments enable row level security;
revoke all on public.mock_question_assignments from anon, authenticated;
