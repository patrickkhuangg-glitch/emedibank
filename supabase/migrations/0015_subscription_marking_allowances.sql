-- 0015_subscription_marking_allowances.sql
-- Annual subscriptions receive marking allowances once per paid subscription
-- period. The grant ledger makes Stripe webhook retries safe and auditable.

alter table public.profiles
  add column if not exists mmi_credits integer not null default 0;

create table if not exists public.subscription_benefit_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  stripe_subscription_id text not null,
  benefit text not null check (benefit in ('gamsat_essay_credits', 'interview_mmi_credits')),
  period_end timestamptz not null,
  amount integer not null check (amount > 0),
  created_at timestamptz not null default now(),
  unique (stripe_subscription_id, benefit, period_end)
);

alter table public.subscription_benefit_grants enable row level security;
create policy "Users read their own subscription benefit grants"
  on public.subscription_benefit_grants for select
  using (auth.uid() = user_id);

create or replace function public.grant_subscription_benefit(
  p_user_id uuid,
  p_stripe_subscription_id text,
  p_benefit text,
  p_period_end timestamptz,
  p_amount integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare inserted_count integer;
begin
  if p_benefit not in ('gamsat_essay_credits', 'interview_mmi_credits') or p_amount <= 0 then
    raise exception 'Invalid subscription benefit';
  end if;

  insert into public.subscription_benefit_grants
    (user_id, stripe_subscription_id, benefit, period_end, amount)
  values
    (p_user_id, p_stripe_subscription_id, p_benefit, p_period_end, p_amount)
  on conflict (stripe_subscription_id, benefit, period_end) do nothing;

  get diagnostics inserted_count = row_count;
  if inserted_count = 0 then return false; end if;

  if p_benefit = 'gamsat_essay_credits' then
    update public.profiles set essay_credits = essay_credits + p_amount where id = p_user_id;
  else
    update public.profiles set mmi_credits = mmi_credits + p_amount where id = p_user_id;
  end if;
  return true;
end $$;

revoke all on function public.grant_subscription_benefit(uuid, text, text, timestamptz, integer) from public, anon, authenticated;
grant execute on function public.grant_subscription_benefit(uuid, text, text, timestamptz, integer) to service_role;

