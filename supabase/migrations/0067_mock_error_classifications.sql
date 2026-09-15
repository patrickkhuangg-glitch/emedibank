-- One editable student-reported primary reason per lost-mark question.
create table if not exists public.mock_error_classifications (
 report_id uuid not null references public.mock_reports(id) on delete cascade,
 question_id uuid not null,
 category text not null check(category in ('Misread the question','Did not know the method','Calculation error','Ran out of time','Changed a correct answer','Guessed','Fell for a distractor')),
 updated_at timestamptz not null default now(),
 primary key(report_id,question_id)
);
alter table public.mock_error_classifications enable row level security;
revoke all on public.mock_error_classifications from anon,authenticated;
grant all on public.mock_error_classifications to service_role;
