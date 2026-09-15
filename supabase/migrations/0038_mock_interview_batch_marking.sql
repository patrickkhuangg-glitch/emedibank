-- Atomic submission of a complete, owner-bound full mock. No existing rows are changed.
begin;
create or replace function public.submit_mock_interview_for_marking(p_session_id uuid,p_expected_credits integer)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare ids uuid[]; a public.interview_attempts; total integer; n integer; unsubmitted integer; balance integer; result text;
begin
 if auth.uid() is null then return jsonb_build_object('status','not_ready'); end if;
 -- Same attempt-before-profile order as individual submission, in stable UUID order.
 select array_agg(id order by id) into ids from (
  select id from public.interview_attempts where user_id=auth.uid()
   and station_snapshot->'mock_session'->>'id'=p_session_id::text order by id for update
 ) locked;
 n:=coalesce(array_length(ids,1),0);
 if n not in (8,10) then return jsonb_build_object('status','not_ready'); end if;
 select * into a from public.interview_attempts where id=ids[1];
 total:=case when a.format='mmi' then 8 else 10 end;
 if n<>total or exists(select 1 from public.interview_attempts x where id=any(ids) and
  (x.format<>a.format or x.media_kind<>'video' or x.station_snapshot->'mock_session'->>'mode' is distinct from 'full'
   or x.station_snapshot->'mock_session'->>'total' is distinct from total::text))
  or (select count(distinct x.station_snapshot->'mock_session'->>'index') from public.interview_attempts x where id=any(ids))<>total
  or exists(select 1 from public.interview_attempts x where id=any(ids) and not exists(
   select 1 from generate_series(0,total-1) i where i::text=x.station_snapshot->'mock_session'->>'index'))
 then return jsonb_build_object('status','not_ready'); end if;
 select count(*) into unsubmitted from public.interview_attempts where id=any(ids) and marking_status is null;
 if unsubmitted=0 then return jsonb_build_object('status','already_submitted','charged',0); end if;
 if p_expected_credits is distinct from unsubmitted then return jsonb_build_object('status','quote_changed','charged',0); end if;
 if exists(select 1 from public.interview_attempts x where id=any(ids) and
  (upload_status<>'ready' or video_deleted_at is not null or (marking_status is null and
   (marking_preflight_at is null or marking_preflight_at<now()-interval '60 seconds' or not exists(
    select 1 from storage.objects o where o.bucket_id='interview-recordings' and o.name=x.recording_path)))))
 then return jsonb_build_object('status','not_ready','charged',0); end if;
 select mmi_credits into balance from public.profiles where id=auth.uid() for update;
 if balance is null or balance<unsubmitted then return jsonb_build_object('status','no_credits','charged',0); end if;
 -- Exceptions roll back every credit, attempt, job and audit write in this block.
 begin
  for a in select * from public.interview_attempts where id=any(ids) and marking_status is null order by id loop
   result:=public.submit_interview_for_marking(a.id);
   if result<>'submitted' then raise exception using errcode='P0001',message='mock_submission_rolled_back'; end if;
  end loop;
 exception when sqlstate 'P0001' then
  return jsonb_build_object('status','not_ready','charged',0);
 end;
 return jsonb_build_object('status','submitted','charged',unsubmitted);
end $$;
revoke all on function public.submit_mock_interview_for_marking(uuid,integer) from public,anon,service_role;
grant execute on function public.submit_mock_interview_for_marking(uuid,integer) to authenticated;
commit;
