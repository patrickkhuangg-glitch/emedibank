-- 0044 — Close essay-credit and marking-queue bypasses; let users save their phone.
-- Already applied to production (2026-09-25); safe to re-run.
--
-- 1. spend_essay_credits accepted any integer, so a negative amount ADDED credits.
--    Reject non-positive amounts and stop anon/PUBLIC from executing it.
-- 2. Students can insert (and, via 0020, partially update) their own
--    essay_responses rows directly through the public API. Marking and submission
--    state must only ever be set by the server (service role), so a trigger resets
--    those fields for any direct anon/authenticated write.
-- 3. 0008 revoked table-wide UPDATE on profiles and only re-granted safe columns.
--    phone_number (0025) was never granted, so the account form could not save it.

-- ── 1. Credit spend ────────────────────────────────────────────────────────────
create or replace function public.spend_essay_credits(p_amount integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare affected integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Credit amount must be positive' using errcode = '22023';
  end if;
  if auth.uid() is null then
    return false;
  end if;

  update public.profiles
     set essay_credits = essay_credits - p_amount
   where id = auth.uid() and essay_credits >= p_amount;
  get diagnostics affected = row_count;
  return affected > 0;
end $$;

revoke all on function public.spend_essay_credits(integer) from public, anon;
grant execute on function public.spend_essay_credits(integer) to authenticated;

-- ── 2. Server-controlled essay fields ─────────────────────────────────────────
-- Not SECURITY DEFINER: current_user must be the calling API role. The service
-- role (server actions) and the SQL editor are unaffected.
create or replace function public.guard_essay_response_server_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.status := 'draft';
    new.marking_status := null;
    new.tutor_feedback := null;
    new.credits_spent := 0;
    new.submitted_for_marking_at := null;
    new.marked_at := null;
  else
    new.user_id := old.user_id;
    new.prompt_id := old.prompt_id;
    new.status := old.status;
    new.marking_status := old.marking_status;
    new.tutor_feedback := old.tutor_feedback;
    new.credits_spent := old.credits_spent;
    new.submitted_for_marking_at := old.submitted_for_marking_at;
    new.marked_at := old.marked_at;
  end if;
  return new;
end $$;

drop trigger if exists guard_essay_response_server_fields on public.essay_responses;
create trigger guard_essay_response_server_fields
  before insert or update on public.essay_responses
  for each row execute function public.guard_essay_response_server_fields();

-- ── 3. Phone number on the account form ───────────────────────────────────────
-- The own-row RLS UPDATE policy still scopes this; the format check and unique
-- index from 0025/0026 still apply.
grant update (phone_number) on public.profiles to authenticated;
