-- 0002_entitlements.sql — Phase 1: accounts & the paywall (commercial core)
--
-- Adds the entitlement layer that answers the one access question the app asks:
--   "Can this user reach this subtest?"
--   -> yes if the subtest is flagged free, OR the user has an active entitlement
--      covering that subtest's exam.
--
-- Free access is NOT stored per user — it is read live from subtests.is_free, so an
-- admin toggling a subtest instantly changes what every free user sees.
--
-- This migration:
--   * completes the exams dimension (all four exams)
--   * adds subtests (free-tier granularity), products, subscriptions, entitlements
--   * adds an is_admin() helper for admin-only RLS
--   * enables + enforces RLS on every new table
-- Subtest rows and product rows are seeded in a LATER migration once their exact
-- lists / pricing are confirmed.

-- ---------------------------------------------------------------------------
-- Complete the exams dimension. GAMSAT was seeded in 0001; add the other three.
-- `active` is a content decision; all four are active so the pricing catalogue
-- shows them. Toggle later via admin.
-- ---------------------------------------------------------------------------
insert into public.exams (name, slug, kind, active) values
  ('UCAT',       'ucat',       'mcq',       true),
  ('ISAT',       'isat',       'mcq',       true),
  ('Interviews', 'interviews', 'interview', true)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- is_admin(uid): SECURITY DEFINER so admin-write RLS policies can check a role
-- without recursive RLS on profiles. STABLE; search_path pinned.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid and p.role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- subtests — free-tier access is granted at this level (is_free, admin-toggled).
-- ---------------------------------------------------------------------------
create table public.subtests (
  id         uuid primary key default gen_random_uuid(),
  exam_id    uuid not null references public.exams (id) on delete cascade,
  name       text not null,
  slug       text not null,
  is_free    boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (exam_id, slug)
);
create index subtests_exam_id_idx on public.subtests (exam_id);

comment on table public.subtests is
  'Subtests per exam. is_free (admin-toggled) is what the free tier reads live.';

-- ---------------------------------------------------------------------------
-- products — mirrors Stripe. kind=exam has an exam_id; kind=bundle is all-access.
-- ---------------------------------------------------------------------------
create type public.product_kind as enum ('exam', 'bundle');

create table public.products (
  id                uuid primary key default gen_random_uuid(),
  stripe_product_id text unique,
  name              text not null,
  kind              public.product_kind not null,
  exam_id           uuid references public.exams (id) on delete set null, -- null for all-access
  created_at        timestamptz not null default now(),
  -- an exam product must name an exam; a bundle must not.
  constraint products_exam_ref_matches_kind check (
    (kind = 'exam' and exam_id is not null) or
    (kind = 'bundle' and exam_id is null)
  )
);

comment on table public.products is
  'Purchasable products mirrored from Stripe: one per exam + an all-access bundle.';

-- ---------------------------------------------------------------------------
-- subscriptions — one row per Stripe subscription. Written only by the webhook
-- (service role); users read their own.
-- ---------------------------------------------------------------------------
create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'canceled');

create table public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users (id) on delete cascade,
  stripe_customer_id     text,
  stripe_subscription_id text unique,
  status                 public.subscription_status not null,
  current_period_end     timestamptz,
  price_id               text,
  product_id             uuid references public.products (id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index subscriptions_user_id_idx on public.subscriptions (user_id);

comment on table public.subscriptions is
  'Stripe subscriptions. Service-role (webhook) writes; users read only their own.';

-- ---------------------------------------------------------------------------
-- entitlements — DERIVED paid access the app checks. Recomputed from
-- subscriptions by the webhook. per-exam sub -> that exam; bundle -> all exams.
-- ---------------------------------------------------------------------------
create type public.entitlement_source as enum ('subscription', 'bundle', 'comp');

create table public.entitlements (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  exam_id    uuid not null references public.exams (id) on delete cascade,
  source     public.entitlement_source not null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, exam_id, source)
);
create index entitlements_user_exam_idx on public.entitlements (user_id, exam_id);

comment on table public.entitlements is
  'Derived per-exam paid access. Recomputed from subscriptions by the webhook.';

-- ===========================================================================
-- Row-Level Security — enforce, do not just enable.
-- ===========================================================================
alter table public.subtests      enable row level security;
alter table public.products      enable row level security;
alter table public.subscriptions enable row level security;
alter table public.entitlements  enable row level security;

-- Public catalogue: anyone can read subtests + products (incl. free flags).
create policy "Subtests are readable by everyone"
  on public.subtests for select using (true);

create policy "Products are readable by everyone"
  on public.products for select using (true);

-- Admin-only writes to the catalogue (exams too — 0001 had no write policy).
create policy "Admins manage subtests"
  on public.subtests for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "Admins manage products"
  on public.products for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "Admins manage exams"
  on public.exams for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Private billing data: a user reads only their own; no user write policy exists,
-- so only the service role (webhook, which bypasses RLS) can write these.
create policy "Users read their own subscriptions"
  on public.subscriptions for select using (auth.uid() = user_id);

create policy "Users read their own entitlements"
  on public.entitlements for select using (auth.uid() = user_id);
