-- 0007_stimuli.sql — shared stimulus (passage / scenario / diagram / table) → many questions.
-- VR: one passage → 4 questions. QR/SJT: a scenario shared by a set. DM: all standalone.
create table public.stimuli (
  id         uuid primary key default gen_random_uuid(),
  subtest_id uuid not null references public.subtests (id) on delete cascade,
  title      text,
  data       jsonb,          -- { passage?, image?, table? }
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index stimuli_subtest_idx on public.stimuli (subtest_id);

alter table public.stimuli enable row level security;
create policy "Admins manage stimuli"
  on public.stimuli for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

comment on table public.stimuli is
  'A shared stimulus (passage/scenario/diagram/table) referenced by a set of questions.';

alter table public.questions add column if not exists stimulus_id uuid references public.stimuli (id) on delete set null;
create index if not exists questions_stimulus_idx on public.questions (stimulus_id);
