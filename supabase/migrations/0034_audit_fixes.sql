-- Audit fixes: least-privilege profile edits and atomic essay submission/marking.
begin;

grant update (phone_number) on public.profiles to authenticated;

create or replace function public.spend_essay_credits(p_amount integer)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if p_amount is null or p_amount <= 0 then return false; end if;
  update public.profiles set essay_credits = essay_credits - p_amount
  where id = auth.uid() and essay_credits >= p_amount;
  return found;
end $$;
revoke all on function public.spend_essay_credits(integer) from public, anon;
grant execute on function public.spend_essay_credits(integer) to authenticated;

-- Students cannot forge submission/marking fields when inserting a response,
-- or change an essay after it has been submitted for review.
revoke insert on public.essay_responses from anon, authenticated;
grant insert (user_id, prompt_id, body, word_count, timed, duration_minutes,
  time_spent_seconds, status, plan, sitting_id) on public.essay_responses to authenticated;
drop policy "Users insert their own essay responses" on public.essay_responses;
create policy "Users insert their own essay responses" on public.essay_responses
  for insert to authenticated with check (auth.uid() = user_id and status = 'draft');
drop policy "Users update their own essay responses" on public.essay_responses;
create policy "Users update their own essay responses" on public.essay_responses
  for update to authenticated using (auth.uid() = user_id and status = 'draft')
  with check (auth.uid() = user_id and status = 'draft');

create function public.request_essay_marking(p_response_id uuid)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare essay public.essay_responses;
begin
  select * into essay from public.essay_responses
  where id = p_response_id and user_id = auth.uid() for update;
  if not found then return 'not_found'; end if;
  if exists (select 1 from public.essay_markings where response_id = essay.id)
    or essay.marking_status in ('pending', 'approved') then return 'already'; end if;
  if essay.body !~ '\S' then return 'empty'; end if;
  -- Two credits per essay. The row lock serializes retries for this response;
  -- the conditional balance update also protects concurrent different essays.
  update public.profiles set essay_credits = essay_credits - 2
  where id = auth.uid() and essay_credits >= 2;
  if not found then return 'no_credits'; end if;
  update public.essay_responses set status = 'submitted', marking_status = 'pending',
    credits_spent = 2, submitted_for_marking_at = now(), updated_at = now()
  where id = essay.id;
  insert into public.essay_markings(response_id, status) values (essay.id, 'pending');
  return 'marked';
end $$;
revoke all on function public.request_essay_marking(uuid) from public, anon;
grant execute on function public.request_essay_marking(uuid) to authenticated;

-- Finalisation is idempotent for an identical retry, including when the response
-- to a successful write was lost. Never silently discard new editor content.
create function public.submit_essay_response(
  p_response_id uuid, p_body text, p_time_spent_seconds integer, p_plan text default null
)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare essay public.essay_responses; final_body text;
begin
  select * into essay from public.essay_responses
  where id = p_response_id and user_id = auth.uid() for update;
  if not found then return 'not_found'; end if;
  final_body := case when coalesce(p_body, '') ~ '\S' then p_body else essay.body end;
  if final_body !~ '\S' then return 'empty'; end if;
  if essay.status = 'submitted' then
    if essay.body = final_body and (p_plan is null or p_plan is not distinct from essay.plan) then return 'submitted'; end if;
    return 'conflict';
  end if;
  if essay.status <> 'draft' then return 'conflict'; end if;
  update public.essay_responses set body = final_body,
    word_count = cardinality(regexp_split_to_array(regexp_replace(final_body, '^\s+|\s+$', '', 'g'), '\s+')),
    time_spent_seconds = greatest(0, coalesce(p_time_spent_seconds, 0)),
    plan = coalesce(p_plan, essay.plan), status = 'submitted', updated_at = now()
  where id = essay.id;
  return 'submitted';
end $$;
revoke all on function public.submit_essay_response(uuid, text, integer, text) from public, anon;
grant execute on function public.submit_essay_response(uuid, text, integer, text) to authenticated;

-- One immutable trial window per account, including abandoned and concurrent
-- checkout requests. Only server code can reserve/read it.
create table public.account_trial_windows (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ends_at timestamptz not null
);
alter table public.account_trial_windows enable row level security;
revoke all on public.account_trial_windows from anon, authenticated;
grant all on public.account_trial_windows to service_role;
create function public.reserve_account_trial(p_user_id uuid)
returns timestamptz language plpgsql security definer set search_path = public, pg_temp as $$
declare trial_end timestamptz;
begin
  insert into public.account_trial_windows(user_id, ends_at)
  values (p_user_id, case when exists (select 1 from public.subscriptions where user_id = p_user_id)
    then now() else now() + interval '7 days' end)
  on conflict (user_id) do nothing;
  select ends_at into trial_end from public.account_trial_windows where user_id = p_user_id;
  return trial_end;
end $$;
revoke all on function public.reserve_account_trial(uuid) from public, anon, authenticated;
grant execute on function public.reserve_account_trial(uuid) to service_role;

commit;
