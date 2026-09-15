-- Versioned completed-mock facts. All access goes through server functions that
-- verify ownership and paid report access; no raw report JSON is client-readable.
create table if not exists public.mock_reports (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id uuid not null references public.exams(id) on delete cascade,
  form_key text not null,
  label text not null,
  completed_at timestamptz not null default now(),
  version integer not null default 1,
  facts jsonb not null check(jsonb_typeof(facts) = 'array'),
  constraint mock_reports_size check(jsonb_array_length(facts) between 1 and 300)
);
create index if not exists mock_reports_user_exam_date on public.mock_reports(user_id,exam_id,completed_at desc);
alter table public.mock_reports enable row level security;
revoke all on public.mock_reports from anon, authenticated;
grant all on public.mock_reports to service_role;
