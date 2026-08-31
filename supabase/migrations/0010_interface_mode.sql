-- Phase C: account-wide interface style preference.
--
-- 'playful' (default) shows the study-cell mascot mark and its flourishes;
-- 'clean' swaps to the faceless exam-mode mark and drops the flourishes.
-- Applied everywhere the user is signed in (see src/lib/auth/dal.ts getInterfaceMode).
--
-- NOTE: migration 0008 revoked table-wide UPDATE on profiles and re-granted only
-- full_name. A column-level grant is therefore required for users to change their
-- own preference; the existing own-row RLS UPDATE policy still scopes it.

alter table public.profiles
  add column interface_mode text not null default 'playful';

alter table public.profiles
  add constraint profiles_interface_mode_check
  check (interface_mode in ('playful', 'clean'));

grant update (interface_mode) on public.profiles to authenticated;
