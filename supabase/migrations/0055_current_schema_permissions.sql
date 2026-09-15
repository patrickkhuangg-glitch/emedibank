-- Reconcile the older production grant set with the current interview schema.
-- No student rows, balances, feedback, storage objects or usage limits change.
begin;
-- No implicit access to future objects. Each migration must grant only what it needs.
revoke create on schema public from public,anon,authenticated;
alter default privileges in schema public revoke all on tables from public,anon,authenticated;
alter default privileges in schema public revoke all on sequences from public,anon,authenticated;
alter default privileges in schema public revoke execute on functions from public,anon,authenticated;
-- PostgreSQL's built-in PUBLIC execute grant is global. A schema-local REVOKE
-- cannot subtract it; remove it at the creator-role level as well.
alter default privileges revoke execute on functions from public,anon,authenticated;

do $$ declare obj record; begin
  for obj in select c.oid::regclass as name,c.relkind from pg_class c
    join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p','v','m') loop
    execute format('revoke all on %s from public,anon,authenticated',obj.name);
    if obj.relkind in ('r','p') then execute format('alter table %s enable row level security',obj.name); end if;
    if obj.relkind='v' then execute format('alter view %s set (security_invoker=true)',obj.name); end if;
  end loop;
  for obj in select p.oid::regprocedure as name from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and not exists(select 1 from pg_depend d where d.objid=p.oid and d.deptype='e') loop
    execute format('revoke all on function %s from public,anon,authenticated',obj.name);
  end loop;
end $$;
revoke all on all sequences in schema public from public,anon,authenticated;

grant select on public.exams,public.subtests,public.products,public.essay_prompts to anon,authenticated;
-- Authenticated administrator writes still pass the existing role-checking RLS.
grant select,insert,update,delete on public.exams,public.subtests,public.products,
  public.questions,public.question_options,public.stimuli,public.essay_prompts,
  public.essay_markings,public.study_plans,public.study_plan_items,public.tutoring_sessions to authenticated;
grant select on public.profiles,public.subscriptions,public.entitlements,public.subscription_benefit_grants,
  public.question_attempts,public.practice_sessions,public.essay_responses,
  public.interview_attempts,public.interview_study_notes to authenticated;
grant update(full_name,phone_number,interface_mode) on public.profiles to authenticated;
grant insert on public.practice_sessions,public.interview_study_notes to authenticated;
grant select,insert,update,delete on public.study_plan_exam_dates,public.study_plan_tasks to authenticated;
grant insert(user_id,prompt_id,body,word_count,timed,duration_minutes,time_spent_seconds,status,plan,sitting_id)
  on public.essay_responses to authenticated;
grant update(body,plan,word_count,time_spent_seconds,updated_at) on public.essay_responses to authenticated;
grant delete on public.essay_responses to authenticated;

-- This helper is used by public catalogue policies. Do not permit role enumeration.
create or replace function public.is_admin(uid uuid) returns boolean
language sql security definer stable set search_path='' as $$
  select uid=auth.uid() and exists(select 1 from public.profiles where id=uid and role='admin')
$$;
grant execute on function public.is_admin(uuid) to anon,authenticated;
grant execute on function public.spend_essay_credits(integer),public.request_essay_marking(uuid),
  public.submit_essay_response(uuid,text,integer,text),public.submit_interview_for_marking(uuid) to authenticated;
-- Later interview features keep their narrowly scoped student grants.
grant select on public.interview_practice_logs,public.interview_story_prompts to authenticated;
grant select,delete on public.interview_stories to authenticated;
grant execute on function public.submit_interview_for_marking(uuid,integer),
  public.submit_mock_interview_for_marking(uuid,integer),
  public.get_my_panel_report(uuid),public.get_my_panel_report_index() to authenticated;

-- The ticket-aware signup/invitation code is already deployed. Activate its gate
-- on installations where 0036 was deferred; do not recreate an existing trigger.
do $$ begin
 if not exists(select 1 from pg_trigger where tgrelid='auth.users'::regclass
   and tgname='require_signup_authorization' and not tgisinternal) then
  create trigger require_signup_authorization before insert on auth.users
    for each row execute function public.require_signup_authorization();
 end if;
end $$;
commit;
