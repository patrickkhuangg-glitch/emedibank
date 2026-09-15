-- Manual grants are separate from paid subscription allowances.
create table public.admin_marking_credit_grants (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  essay_amount integer not null check (essay_amount between 0 and 10000),
  interview_amount integer not null check (interview_amount between 0 and 10000),
  note text not null default '' check (length(note) <= 500),
  created_at timestamptz not null default now(),
  check (essay_amount > 0 or interview_amount > 0)
);
alter table public.admin_marking_credit_grants enable row level security;
revoke all on public.admin_marking_credit_grants from public, anon, authenticated;
grant select, insert on public.admin_marking_credit_grants to service_role;

create function public.add_admin_marking_credits(
  p_request_id uuid, p_actor_id uuid, p_user_id uuid,
  p_essay_amount integer, p_interview_amount integer, p_note text
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  student public.profiles%rowtype;
  previous public.admin_marking_credit_grants%rowtype;
  inserted_id uuid;
begin
  -- The server supplies the authenticated actor; this RPC is service-role only.
  perform 1 from public.profiles where id=p_actor_id and role='admin' for share;
  if not found then raise exception 'admin_required'; end if;
  if p_request_id is null or p_user_id is null or p_essay_amount is null or p_interview_amount is null
    or p_essay_amount not between 0 and 10000 or p_interview_amount not between 0 and 10000
    or (p_essay_amount=0 and p_interview_amount=0) or p_note is null or length(p_note)>500
  then raise exception 'invalid_credit_grant'; end if;

  select * into student from public.profiles where id=p_user_id and role='student' for update;
  if not found then return jsonb_build_object('status','student_unavailable'); end if;
  insert into public.admin_marking_credit_grants(id,user_id,actor_id,essay_amount,interview_amount,note)
    values(p_request_id,p_user_id,p_actor_id,p_essay_amount,p_interview_amount,p_note)
    on conflict(id) do nothing returning id into inserted_id;
  if inserted_id is null then
    select * into previous from public.admin_marking_credit_grants where id=p_request_id;
    if previous.user_id is distinct from p_user_id or previous.actor_id is distinct from p_actor_id
      or previous.essay_amount is distinct from p_essay_amount or previous.interview_amount is distinct from p_interview_amount
      or previous.note is distinct from p_note then return jsonb_build_object('status','request_conflict'); end if;
    return jsonb_build_object('status','already_applied','essay_credits',student.essay_credits,'mmi_credits',student.mmi_credits);
  end if;
  -- Arithmetic and ledger insertion commit together, including during marking spends.
  update public.profiles set essay_credits=essay_credits+p_essay_amount, mmi_credits=mmi_credits+p_interview_amount
    where id=p_user_id returning * into student;
  return jsonb_build_object('status','added','essay_credits',student.essay_credits,'mmi_credits',student.mmi_credits);
end $$;
revoke all on function public.add_admin_marking_credits(uuid,uuid,uuid,integer,integer,text) from public,anon,authenticated;
grant execute on function public.add_admin_marking_credits(uuid,uuid,uuid,integer,integer,text) to service_role;
