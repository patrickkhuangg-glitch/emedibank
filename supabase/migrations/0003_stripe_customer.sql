-- 0003_stripe_customer.sql — Phase 1: link a user to their Stripe customer.
--
-- One Stripe customer per user, created on first checkout and reused for the
-- billing portal and all future subscriptions. Kept on profiles so it exists
-- before any subscription row does.
alter table public.profiles
  add column if not exists stripe_customer_id text unique;
