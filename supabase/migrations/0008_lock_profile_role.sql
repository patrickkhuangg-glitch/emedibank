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
-- Fix: strip UPDATE on the `role` column from the public roles. Profile edits
-- (e.g. full_name) still work; `role` is now writable only by the service role
-- (seeding / admin tooling), which bypasses column grants and RLS.

revoke update (role) on public.profiles from anon, authenticated;

-- (Optional hardening) also block the column from any future default grant:
-- alter default privileges in schema public revoke update on tables from anon, authenticated;
