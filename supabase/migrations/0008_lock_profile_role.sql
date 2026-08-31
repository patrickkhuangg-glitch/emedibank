-- 0008 — SECURITY FIX (apply immediately): prevent privilege escalation.
--
-- The profiles UPDATE RLS policy is row-level ("auth.uid() = id"), so a signed-in
-- user could update ANY column of their own row — including `role`. That let an
-- ordinary user self-promote to 'admin' via the public/anon key:
--
--     supabase.from('profiles').update({ role: 'admin' }).eq('id', myUserId)
--
-- An admin can then read answer keys (question_options), manage/delete questions,
-- and toggle subtests.is_free to bypass the paywall.
--
-- WHY THE FIRST ATTEMPT DID NOT WORK
-- ----------------------------------
-- A *column-level* `REVOKE UPDATE (role)` CANNOT subtract from a *table-level*
-- `GRANT UPDATE`. Supabase grants anon/authenticated table-wide UPDATE by default
-- and relies on RLS for row gating, so revoking just the `role` column was a no-op:
-- the table-wide grant still covered every column, escalation still worked.
--
-- CORRECT FIX
-- -----------
-- Drop the table-wide UPDATE grant, then re-grant UPDATE on ONLY the safe column.
-- `profiles` has four columns: id, full_name, role, created_at — the sole column a
-- user should ever change is `full_name`. `role` (and id/created_at) become
-- writable only by the service role, which bypasses column grants and RLS
-- (seeding / admin tooling still works).

revoke update on public.profiles from anon, authenticated;
grant  update (full_name) on public.profiles to authenticated;

-- Defense in depth: block any future default grant from re-widening UPDATE.
alter default privileges in schema public revoke update on tables from anon, authenticated;
