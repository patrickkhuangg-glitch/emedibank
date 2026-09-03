-- Private pre-launch email list. Browser clients receive no direct table access;
-- signups pass through a validated server action using the service-role client.
create table if not exists public.launch_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null default 'landing_page',
  consented_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint launch_waitlist_email_normalized check (email = lower(trim(email))),
  constraint launch_waitlist_email_length check (char_length(email) between 3 and 254),
  unique (email)
);

alter table public.launch_waitlist enable row level security;
revoke all on table public.launch_waitlist from anon, authenticated;

