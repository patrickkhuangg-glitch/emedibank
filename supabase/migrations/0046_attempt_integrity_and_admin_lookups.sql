-- 0046 — Attempt integrity, scalable stats, atomic essay marking requests and
-- admin email lookup. Additive: safe to run before or after the matching deploy.

-- ── question_attempts: students may read, never write ─────────────────────────
-- Attempts are graded and recorded server-side (service role). The old FOR ALL
-- policy let a student insert/edit/delete their own rows through the public API,
-- forging accuracy, dashboard XP and the pooled platform average.
drop policy if exists "Users manage their own attempts" on public.question_attempts;
drop policy if exists "Users read their own attempts" on public.question_attempts;
create policy "Users read their own attempts"
  on public.question_attempts for select
  using (auth.uid() = user_id);
revoke insert, update, delete on public.question_attempts from anon, authenticated;

create index if not exists question_attempts_exam_subtest_idx
  on public.question_attempts (exam_id, subtest_id);
create index if not exists question_attempts_user_question_idx
  on public.question_attempts (user_id, question_id);

-- ── Pooled platform accuracy, aggregated in SQL ───────────────────────────────
-- Replaces fetching every attempt row, which the API silently capped at 1,000.
create or replace function public.platform_subtest_accuracy(p_exam_id uuid)
returns table (subtest_id uuid, total bigint, correct bigint)
language sql
stable
set search_path = ''
as $$
  select a.subtest_id, count(*), count(*) filter (where a.is_correct)
    from public.question_attempts a
   where a.exam_id = p_exam_id
   group by a.subtest_id
$$;
revoke all on function public.platform_subtest_accuracy(uuid) from public, anon, authenticated;
grant execute on function public.platform_subtest_accuracy(uuid) to service_role;

-- ── Atomic essay marking request ──────────────────────────────────────────────
-- One transaction: lock the essay, check ownership/state, debit credits, move it
-- into the tutor queue. Two concurrent requests can no longer both charge, and a
-- failed queue write can no longer leave credits spent with nothing queued.
create or replace function public.enqueue_essay_marking(
  p_user_id uuid,
  p_response_id uuid,
  p_cost integer
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.essay_responses;
  ts timestamptz := now();
begin
  if p_cost is null or p_cost <= 0 then
    raise exception 'Credit cost must be positive' using errcode = '22023';
  end if;

  select * into r from public.essay_responses where id = p_response_id for update;
  if not found or r.user_id is distinct from p_user_id then return 'not_found'; end if;
  if r.marking_status in ('pending', 'approved') then return 'already'; end if;
  if btrim(r.body, E' \t\r\n') = '' then return 'empty'; end if;

  update public.profiles
     set essay_credits = essay_credits - p_cost
   where id = p_user_id and essay_credits >= p_cost;
  if not found then return 'no_credits'; end if;

  update public.essay_responses
     set status = 'submitted',
         marking_status = 'pending',
         submitted_for_marking_at = ts,
         credits_spent = p_cost,
         updated_at = ts
   where id = p_response_id;

  insert into public.essay_markings (response_id, status, updated_at)
  values (p_response_id, 'pending', ts)
  on conflict (response_id) do update set status = 'pending', updated_at = ts;

  return 'ok';
end $$;
revoke all on function public.enqueue_essay_marking(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.enqueue_essay_marking(uuid, uuid, integer) to service_role;

-- ── Admin lookup of an account by email ───────────────────────────────────────
-- auth.admin.listUsers() pages at 1,000; searching one page silently missed
-- every account beyond it.
create or replace function public.find_user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.id from auth.users u where lower(u.email) = lower(btrim(p_email)) limit 1
$$;
revoke all on function public.find_user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.find_user_id_by_email(text) to service_role;

-- ── Questions that carry student history ──────────────────────────────────────
-- Deleting a question cascades to every student's attempts and to mock forms.
-- The admin bulk delete unpublishes these instead of deleting them.
create or replace function public.questions_with_history(p_ids uuid[])
returns setof uuid
language sql
stable
set search_path = ''
as $$
  select q.id
    from unnest(p_ids) as q(id)
   where exists (select 1 from public.question_attempts a where a.question_id = q.id)
      or exists (select 1 from public.mock_question_assignments m where m.question_id = q.id)
$$;
revoke all on function public.questions_with_history(uuid[]) from public, anon, authenticated;
grant execute on function public.questions_with_history(uuid[]) to service_role;
