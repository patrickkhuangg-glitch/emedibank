-- A single saved answer is not eligible for panel marking.
-- Existing saved reports are preserved; multi-response excerpts still cost 12 credits.
begin;
create or replace function public.panel_members_ready(p_id uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select count(*) between 2 and 10 and bool_and((a.user_id=m.user_id and a.format='panel' and a.media_kind='video' and a.upload_status='ready' and a.video_deleted_at is null
 and a.transcription_status='ready' and length(trim(coalesce(a.transcript,'')))>0
 and a.station_snapshot#>>'{mock_session,id}'=m.mock_session_id::text and a.station_snapshot#>>'{mock_session,mode}'='full'
 and a.station_snapshot#>>'{mock_session,total}'='10' and a.station_snapshot#>>'{mock_session,index}'=x.sequence_index::text) is true)
 from public.interview_mock_markings m join public.interview_mock_marking_members x on x.marking_id=m.id join public.interview_attempts a on a.id=x.attempt_id where m.id=p_id
$$;
create or replace function public.submit_whole_panel_for_marking(p_session_id uuid,p_user_id uuid,p_expected_credits integer,p_expected_responses integer default null) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare ids uuid[];member_row public.interview_attempts;m public.interview_mock_markings;begin
 select array_agg(id order by id) into ids from (select id from public.interview_attempts where user_id=p_user_id and station_snapshot#>>'{mock_session,id}'=p_session_id::text order by id for update) q;
 select * into m from public.interview_mock_markings where mock_session_id=p_session_id for update;
 if found then return jsonb_build_object('status',case when m.user_id=p_user_id then 'already_submitted' else 'not_ready' end,'charged',0);end if;
 if coalesce(array_length(ids,1),0) not between 2 and 10 or exists(select 1 from public.interview_attempts where id=any(ids) and (format<>'panel' or media_kind<>'video' or station_snapshot#>>'{mock_session,mode}' is distinct from 'full' or station_snapshot#>>'{mock_session,total}' is distinct from '10'))
 or (select count(distinct station_snapshot#>>'{mock_session,index}') from public.interview_attempts where id=any(ids))<>array_length(ids,1)
 or exists(select 1 from public.interview_attempts a where id=any(ids) and not exists(select 1 from generate_series(0,9) i where i::text=a.station_snapshot#>>'{mock_session,index}')) then return jsonb_build_object('status','not_ready','charged',0);end if;
 if exists(select 1 from public.interview_attempts where station_snapshot#>>'{mock_session,id}'=p_session_id::text and user_id<>p_user_id) then return jsonb_build_object('status','not_ready','charged',0);end if;
 if p_expected_responses is not null and p_expected_responses<>array_length(ids,1) then return jsonb_build_object('status','quote_changed','charged',0);end if;
 -- Existing individual marks use the explicitly labelled legacy path; never reinterpret them.
 if exists(select 1 from public.interview_attempts where id=any(ids) and marking_status is not null) then return jsonb_build_object('status','legacy_response_marks','charged',0);end if;
 if p_expected_credits is distinct from 12 then return jsonb_build_object('status','quote_changed','charged',0);end if;
 if exists(select 1 from public.interview_attempts a where id=any(ids) and (upload_status<>'ready' or video_deleted_at is not null or marking_preflight_at is null or marking_preflight_at<now()-interval '60 seconds' or not exists(select 1 from storage.objects where bucket_id='interview-recordings' and name=a.recording_path))) then return jsonb_build_object('status','not_ready','charged',0);end if;
 update public.profiles set mmi_credits=mmi_credits-12 where id=p_user_id and mmi_credits>=12;
 if not found then return jsonb_build_object('status','no_credits','charged',0);end if;
 insert into public.interview_mock_markings(mock_session_id,user_id,credits_spent) values(p_session_id,p_user_id,12) returning * into m;
 insert into public.interview_mock_marking_members(marking_id,attempt_id,sequence_index) select m.id,id,(station_snapshot#>>'{mock_session,index}')::integer from public.interview_attempts where id=any(ids);
 update public.interview_attempts set marking_status='queued',submitted_for_marking_at=now(),marking_preflight_at=null where id=any(ids);
 for member_row in select * from public.interview_attempts where id=any(ids) and (transcription_status<>'ready' or length(trim(coalesce(transcript,'')))=0) loop
  insert into public.interview_processing_jobs(attempt_id,job_type) values(member_row.id,'transcribe') on conflict(attempt_id,job_type) do update set status=case when interview_processing_jobs.status in ('dead','failed','succeeded') then 'queued' else interview_processing_jobs.status end,attempt_count=case when interview_processing_jobs.status in ('dead','failed','succeeded') then 0 else interview_processing_jobs.attempt_count end,available_at=now();
 end loop;
 insert into public.interview_mock_marking_events(marking_id,actor_id,event_type,metadata) values(m.id,p_user_id,'credit_spent','{"amount":12}');
 perform public.queue_ready_panel(m.id);
 return jsonb_build_object('status','submitted','charged',12);
end $$;

commit;
