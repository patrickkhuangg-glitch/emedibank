begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
do $$
declare fixture uuid:=gen_random_uuid(); session_id uuid:=gen_random_uuid(); attempt_id uuid; outcome jsonb; balance integer;
begin
 if not has_function_privilege('authenticated','public.submit_mock_interview_for_marking(uuid,integer)','execute') or has_function_privilege('anon','public.submit_mock_interview_for_marking(uuid,integer)','execute') then raise exception 'batch RPC privileges incorrect'; end if;
 insert into auth.users(id,email,raw_user_meta_data) values(fixture,'rollback-mock-'||fixture::text||'@example.invalid','{"full_name":"Temporary rollback test"}');
 insert into public.profiles(id,full_name,role,mmi_credits) values(fixture,'Temporary rollback test','student',0) on conflict(id) do update set mmi_credits=0;
 for i in 0..7 loop
  attempt_id:=gen_random_uuid();
  insert into public.interview_attempts(id,user_id,format,station_id,station_title,recording_path,recording_mime_type,media_kind,upload_status,marking_preflight_at,station_snapshot)
  values(attempt_id,fixture,'mmi','rollback-test','Temporary rollback test',fixture::text||'/'||attempt_id::text||'/response.webm','video/webm','video','ready',now(),jsonb_build_object('mock_session',jsonb_build_object('id',session_id,'mode','full','index',i,'total',8)));
  insert into storage.objects(bucket_id,name,metadata) values('interview-recordings',fixture::text||'/'||attempt_id::text||'/response.webm','{"size":1024,"mimetype":"video/webm"}');
 end loop;
 perform set_config('request.jwt.claim.sub',fixture::text,true);
 outcome:=public.submit_mock_interview_for_marking(session_id,12);
 if outcome->>'status'<>'no_credits' then raise exception 'insufficient-credit check failed'; end if;
 if exists(select 1 from public.interview_attempts where user_id=fixture and marking_status is not null) then raise exception 'unexpected partial submission'; end if;
 update public.profiles set mmi_credits=12 where id=fixture;
 outcome:=public.submit_mock_interview_for_marking(session_id,12);
 if outcome->>'status'<>'submitted' or (outcome->>'charged')::int<>12 then raise exception 'batch submission failed'; end if;
 select mmi_credits into balance from public.profiles where id=fixture;
 if balance<>0 or (select count(*) from public.interview_attempts where user_id=fixture and marking_status='queued')<>8 then raise exception 'batch debit/queue mismatch'; end if;
 outcome:=public.submit_mock_interview_for_marking(session_id,12);
 if outcome->>'status'<>'already_submitted' or (outcome->>'charged')::int<>0 then raise exception 'retry charged twice'; end if;
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 if public.submit_mock_interview_for_marking(session_id,12)->>'status'<>'not_ready' then raise exception 'owner boundary failed'; end if;
end $$;
rollback;
select 'passed: privileges, insufficient credits, atomic eight-response submission, retry and ownership; all fixture rows rolled back' as result;
