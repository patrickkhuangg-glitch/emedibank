-- Current prices. Historical charges and refunds are preserved; no existing rows change.
begin;
create or replace function public.enqueue_priced_interview_marking(p_attempt_id uuid,p_cost integer) returns text
language plpgsql security definer set search_path=public,pg_temp as $$
declare a public.interview_attempts; first_job text;
begin
 if p_cost is null or p_cost<0 or p_cost>12 then return 'not_ready'; end if;
 select * into a from public.interview_attempts where id=p_attempt_id and user_id=auth.uid() for update;
 if not found then return 'not_ready'; end if;
 if a.marking_status is not null then return 'already_submitted'; end if;
 if a.marking_preflight_at is null or a.marking_preflight_at<now()-interval '60 seconds' or a.upload_status <> 'ready' or a.video_deleted_at is not null or not exists(
 select 1 from storage.objects where bucket_id='interview-recordings' and name=a.recording_path
 ) then return 'not_ready'; end if;
 update public.profiles set mmi_credits=mmi_credits-p_cost where id=a.user_id and mmi_credits>=p_cost;
 if not found then return 'no_credits'; end if;
 first_job := case when a.transcription_status='ready' and length(trim(a.transcript))>0 then 'assess' else 'transcribe' end;
 update public.interview_attempts set credits_spent=p_cost,marking_status='queued',submitted_for_marking_at=now(),marking_preflight_at=null where id=a.id;
 insert into public.interview_markings(attempt_id) values(a.id);
 insert into public.interview_processing_jobs(attempt_id,job_type) values(a.id,first_job)
 on conflict(attempt_id,job_type) do update set status=case when interview_processing_jobs.status in ('dead','failed') then 'queued' else interview_processing_jobs.status end,
 attempt_count=case when interview_processing_jobs.status in ('dead','failed') then 0 else interview_processing_jobs.attempt_count end, available_at=now();
 insert into public.interview_marking_events(attempt_id,actor_id,event_type,metadata) values(a.id,auth.uid(),'credit_spent',jsonb_build_object('amount',p_cost));
 return 'submitted';
end $$;

revoke all on function public.enqueue_priced_interview_marking(uuid,integer) from public,anon,authenticated,service_role;
-- Old tabs cannot silently spend a newly increased price.
create or replace function public.submit_interview_for_marking(p_attempt_id uuid) returns text
language sql security definer set search_path=public,pg_temp as $$
 select case when exists(select 1 from public.interview_attempts where id=p_attempt_id and user_id=auth.uid() and marking_status is not null) then 'already_submitted' else 'quote_changed' end
$$;
create or replace function public.submit_interview_for_marking(p_attempt_id uuid,p_expected_credits integer) returns text
language plpgsql security definer set search_path=public,pg_temp as $$
declare a public.interview_attempts; cost integer;
begin
 select * into a from public.interview_attempts where id=p_attempt_id and user_id=auth.uid() for update;
 if not found then return 'not_ready'; end if;
 if a.marking_status is not null then return 'already_submitted'; end if;
 cost:=case when a.format='mmi' then 2 else 1 end;
 if p_expected_credits is distinct from cost then return 'quote_changed'; end if;
 return public.enqueue_priced_interview_marking(a.id,cost);
end $$;
revoke all on function public.submit_interview_for_marking(uuid,integer) from public,anon,service_role;
grant execute on function public.submit_interview_for_marking(uuid,integer) to authenticated;
create or replace function public.submit_mock_interview_for_marking(p_session_id uuid,p_expected_credits integer)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare ids uuid[]; a public.interview_attempts; total integer; n integer; unsubmitted integer; balance integer; result text; cost integer; allocation integer; position integer:=0;
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
 select greatest(0,12-coalesce(sum(credits_spent),0))::integer into cost from public.interview_attempts where id=any(ids);
 if p_expected_credits is distinct from cost then return jsonb_build_object('status','quote_changed','charged',0); end if;
 if exists(select 1 from public.interview_attempts x where id=any(ids) and
  (upload_status<>'ready' or video_deleted_at is not null or (marking_status is null and
   (marking_preflight_at is null or marking_preflight_at<now()-interval '60 seconds' or not exists(
    select 1 from storage.objects o where o.bucket_id='interview-recordings' and o.name=x.recording_path)))))
 then return jsonb_build_object('status','not_ready','charged',0); end if;
 select mmi_credits into balance from public.profiles where id=auth.uid() for update;
 if balance is null or balance<cost then return jsonb_build_object('status','no_credits','charged',0); end if;
 -- Exceptions roll back every credit, attempt, job and audit write in this block.
 begin
  for a in select * from public.interview_attempts where id=any(ids) and marking_status is null order by (station_snapshot->'mock_session'->>'index')::integer loop
   allocation:=cost/unsubmitted+case when position<cost%unsubmitted then 1 else 0 end;
   position:=position+1;
   result:=public.enqueue_priced_interview_marking(a.id,allocation);
   if result<>'submitted' then raise exception using errcode='P0001',message='mock_submission_rolled_back'; end if;
  end loop;
 exception when sqlstate 'P0001' then
  return jsonb_build_object('status','not_ready','charged',0);
 end;
 return jsonb_build_object('status','submitted','charged',cost);
end $$;
revoke all on function public.submit_mock_interview_for_marking(uuid,integer) from public,anon,service_role;
grant execute on function public.submit_mock_interview_for_marking(uuid,integer) to authenticated;
commit;
