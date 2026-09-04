-- 0024 — Tutor-managed student packages and their study-plan inclusions.

create type public.study_plan_status as enum ('active', 'paused', 'completed');
create type public.study_plan_item_kind as enum ('tutoring', 'masterclass', 'workshop', 'other');

create table public.study_plans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 120),
  status      public.study_plan_status not null default 'active',
  starts_on   date,
  ends_on     date,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

create index study_plans_user_updated_idx on public.study_plans (user_id, updated_at desc);

create table public.study_plan_items (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid not null references public.study_plans (id) on delete cascade,
  kind        public.study_plan_item_kind not null default 'tutoring',
  title       text not null check (char_length(title) between 1 and 120),
  exam_scope  text,
  total_units numeric(7,2) not null check (total_units > 0),
  used_units  numeric(7,2) not null default 0 check (used_units >= 0 and used_units <= total_units),
  unit_label  text not null default 'hours' check (unit_label in ('hours', 'sessions', 'places', 'credits')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index study_plan_items_plan_idx on public.study_plan_items (plan_id, created_at);

alter table public.study_plans enable row level security;
alter table public.study_plan_items enable row level security;

create policy "Students read their own study plans"
  on public.study_plans for select
  using (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "Admins manage study plans"
  on public.study_plans for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "Students read items in their own study plans"
  on public.study_plan_items for select
  using (
    exists (
      select 1 from public.study_plans plan
      where plan.id = study_plan_items.plan_id
        and (plan.user_id = auth.uid() or public.is_admin(auth.uid()))
    )
  );

create policy "Admins manage study plan items"
  on public.study_plan_items for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

comment on table public.study_plans is
  'Tutor-managed study packages belonging to a single student.';

comment on table public.study_plan_items is
  'Hours, sessions, masterclasses and other inclusions within a student study package.';
