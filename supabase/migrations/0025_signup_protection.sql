-- 0025 — Required phone contact for new accounts and privacy-preserving signup limits.

alter table public.profiles
  add column phone_number text;

alter table public.profiles
  add constraint profiles_phone_number_format
  check (phone_number is null or phone_number ~ '^\+[1-9][0-9]{7,14}$');

create unique index profiles_phone_number_unique
  on public.profiles (phone_number)
  where phone_number is not null;

-- Keep the profile trigger in step with the signup metadata sent by the app.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone_number)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    nullif(new.raw_user_meta_data ->> 'phone_number', '')
  );
  return new;
end;
$$;

create table public.signup_rate_limits (
  key_hash          text primary key,
  window_started_at timestamptz not null default now(),
  attempts          integer not null default 1 check (attempts >= 1),
  last_attempt_at   timestamptz not null default now()
);

alter table public.signup_rate_limits enable row level security;

-- Called only with the service-role key. The database increments atomically so
-- parallel signup attempts cannot exceed the configured allowance.
create or replace function public.consume_signup_attempt(
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  allowed boolean;
begin
  insert into public.signup_rate_limits as limits (key_hash)
  values (p_key_hash)
  on conflict (key_hash) do update
  set
    attempts = case
      when limits.window_started_at <= now() - make_interval(secs => p_window_seconds) then 1
      else limits.attempts + 1
    end,
    window_started_at = case
      when limits.window_started_at <= now() - make_interval(secs => p_window_seconds) then now()
      else limits.window_started_at
    end,
    last_attempt_at = now()
  returning attempts <= p_limit into allowed;

  return allowed;
end;
$$;

revoke all on function public.consume_signup_attempt(text, integer, integer) from public;
grant execute on function public.consume_signup_attempt(text, integer, integer) to service_role;

comment on column public.profiles.phone_number is
  'Mobile number collected at signup in E.164 format for account and trial-abuse controls.';

comment on table public.signup_rate_limits is
  'HMAC-hashed signup identifiers only; used for short, server-side rate-limit windows.';
