-- 0045 — Account-level 7-day free trial.
-- Already applied to production (2026-09-25); safe to re-run (the backfill
-- only fills empty rows).
--
-- Every new account gets full access to every exam (including Interviews) for
-- seven days from signup. After that, access requires a paid subscription (or a
-- manual comp entitlement). There is no longer a free tier: subtests.is_free and
-- free mocks are ignored by the app.
--
-- trial_ends_at is server-controlled: 0008 revoked table-wide UPDATE on profiles
-- and only safe columns are re-granted, so students cannot extend it.

alter table public.profiles
  add column if not exists trial_ends_at timestamptz;

-- Existing accounts get a fresh seven days from when this migration runs.
update public.profiles
   set trial_ends_at = now() + interval '7 days'
 where trial_ends_at is null;

-- New accounts (handle_new_user inserts without this column) start their trial
-- at signup.
alter table public.profiles
  alter column trial_ends_at set default (now() + interval '7 days'),
  alter column trial_ends_at set not null;

comment on column public.profiles.trial_ends_at is
  'End of the account-level free trial. Full access to every exam until then.';
