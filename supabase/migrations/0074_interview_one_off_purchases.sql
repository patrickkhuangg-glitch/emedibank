begin;

create table public.interview_purchase_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  checkout_session_id text not null unique,
  price_id text not null,
  offer_id text not null,
  offer_kind text not null check (offer_kind in ('plan', 'credits')),
  credits integer not null check (credits > 0),
  amount_minor integer not null check (amount_minor > 0),
  currency text not null check (currency ~ '^[a-z]{3}$'),
  access_expires_at timestamptz,
  created_at timestamptz not null default now(),
  check ((offer_kind = 'plan' and access_expires_at is not null) or
    (offer_kind = 'credits' and access_expires_at is null))
);

create index interview_purchase_grants_user_created_idx
  on public.interview_purchase_grants(user_id, created_at desc);

alter table public.interview_purchase_grants enable row level security;
create policy "Users read their own interview purchases"
  on public.interview_purchase_grants for select
  using (auth.uid() = user_id);

grant select on public.interview_purchase_grants to authenticated, service_role;

create function public.grant_interview_purchase(
  p_user_id uuid,
  p_checkout_session_id text,
  p_price_id text,
  p_offer_id text,
  p_offer_kind text,
  p_credits integer,
  p_access_days integer,
  p_amount_minor integer,
  p_currency text
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  interview_exam_id uuid;
  purchase_expiry timestamptz;
  valid_offer boolean;
begin
  select exists (
    select 1
    from (values
      ('core', 'plan', 6, 365, 19900),
      ('pro', 'plan', 18, 365, 34900),
      ('intensive', 'plan', 36, 365, 59900),
      ('credits-6', 'credits', 6, 0, 9900),
      ('credits-12', 'credits', 12, 0, 18900),
      ('credits-24', 'credits', 24, 0, 35900)
    ) as offer(id, kind, credits, access_days, amount_minor)
    where offer.id = p_offer_id
      and offer.kind = p_offer_kind
      and offer.credits = p_credits
      and offer.access_days = p_access_days
      and offer.amount_minor = p_amount_minor
  ) into valid_offer;

  if not valid_offer or p_currency <> 'aud'
    or nullif(p_checkout_session_id, '') is null
    or nullif(p_price_id, '') is null then
    raise exception 'Invalid interview purchase';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id and role = 'student') then
    raise exception 'Interview purchase owner not found';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('interview-purchase:' || p_user_id::text, 0));
  if exists (select 1 from public.interview_purchase_grants where checkout_session_id = p_checkout_session_id) then
    return false;
  end if;

  select id into interview_exam_id from public.exams where kind = 'interview' and active limit 1;
  if interview_exam_id is null then raise exception 'Interview exam not found'; end if;
  if p_offer_kind = 'credits' and not public.interview_full_access(p_user_id) then
    raise exception 'Paid Interview access is required for credit add-ons';
  end if;

  if p_offer_kind = 'plan' then
    select greatest(coalesce(max(expires_at), now()), now()) + make_interval(days => p_access_days)
      into purchase_expiry
      from public.entitlements
      where user_id = p_user_id and exam_id = interview_exam_id and source = 'purchase';
  end if;

  insert into public.interview_purchase_grants
    (user_id, checkout_session_id, price_id, offer_id, offer_kind, credits,
      amount_minor, currency, access_expires_at)
  values
    (p_user_id, p_checkout_session_id, p_price_id, p_offer_id, p_offer_kind, p_credits,
      p_amount_minor, p_currency, purchase_expiry);

  if p_offer_kind = 'plan' then
    insert into public.entitlements(user_id, exam_id, source, expires_at, interview_trial_only)
    values (p_user_id, interview_exam_id, 'purchase', purchase_expiry, false)
    on conflict (user_id, exam_id, source) do update
      set expires_at = excluded.expires_at, interview_trial_only = false;
  end if;

  update public.profiles set mmi_credits = mmi_credits + p_credits where id = p_user_id;
  return true;
end
$$;

revoke all on function public.grant_interview_purchase(uuid, text, text, text, text, integer, integer, integer, text)
  from public, anon, authenticated;
grant execute on function public.grant_interview_purchase(uuid, text, text, text, text, integer, integer, integer, text)
  to service_role;

commit;
