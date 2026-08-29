-- 0001_init.sql — Phase 0 foundation schema
--
-- The golden rule: the platform is multi-exam from the schema up. Every piece of
-- content and access hangs off a row in `exams`. "GAMSAT" is data, never code.
--
-- This migration:
--   * defines the exam_kind and user_role enums
--   * creates `exams` and `profiles`
--   * enables Row-Level Security on both, with owner-only policies for profiles
--   * exposes active exams read-only to everyone (public catalogue)
--   * wires a trigger so each new auth user gets a profiles row
--   * seeds the first exam: GAMSAT

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.exam_kind as enum ('mcq', 'interview');
create type public.user_role as enum ('student', 'tutor', 'admin');

-- ---------------------------------------------------------------------------
-- exams — the spine of the platform. Add UCAT/interview later as new rows.
-- ---------------------------------------------------------------------------
create table public.exams (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  kind       public.exam_kind not null,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.exams is
  'Every exam the platform supports. All content/access references an exam by id.';

-- ---------------------------------------------------------------------------
-- profiles — one row per auth user, holding app-level fields like role.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text,
  role       public.user_role not null default 'student',
  created_at timestamptz not null default now()
);

comment on table public.profiles is
  'Application profile for each auth user. role gates access (student|tutor|admin).';

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------
alter table public.exams enable row level security;
alter table public.profiles enable row level security;

-- exams: the active catalogue is public and read-only. Writes are admin-only
-- and go through the secret key (which bypasses RLS), so no write policy exists.
create policy "Active exams are readable by everyone"
  on public.exams
  for select
  using (active = true);

-- profiles: a user can see and edit only their own row.
create policy "Users can read their own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- New-signup trigger: create a profiles row whenever an auth user is created.
-- SECURITY DEFINER so it can insert past RLS; search_path pinned for safety.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Seed: the first exam. GAMSAT launches first; UCAT/interview are later rows.
-- ---------------------------------------------------------------------------
insert into public.exams (name, slug, kind, active)
values ('GAMSAT', 'gamsat', 'mcq', true)
on conflict (slug) do nothing;
