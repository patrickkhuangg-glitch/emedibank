begin;

-- Bring the existing deliberate-practice ledger in line with the published
-- reward rules. Historical events remain unchanged and auditable.
alter table public.interview_progression_settings drop constraint if exists interview_progression_settings_check;
alter table public.interview_progression_settings
  add column spaced_review_xp integer not null default 20 check (spaced_review_xp >= 0),
  add column retention_bonus_xp integer not null default 10 check (retention_bonus_xp >= 0),
  add column circuit_xp integer not null default 75 check (circuit_xp >= 0),
  add column consistency_week_xp integer not null default 50 check (consistency_week_xp >= 0),
  add column total_daily_xp_cap integer not null default 250 check (total_daily_xp_cap between 1 and 10000),
  add constraint interview_progression_settings_daily_loop_check
    check (first_attempt_xp + review_xp + retry_xp + demonstrated_xp = daily_xp);

update public.interview_progression_settings set
  daily_xp=70,
  first_attempt_xp=20,
  review_xp=10,
  retry_xp=25,
  demonstrated_xp=15,
  spaced_review_xp=20,
  retention_bonus_xp=10,
  circuit_xp=75,
  consistency_week_xp=50,
  total_daily_xp_cap=250,
  updated_at=now()
where id=true;

alter table public.interview_progression_events drop constraint if exists interview_progression_events_event_type_check;
alter table public.interview_progression_events
  add column explanation text;
update public.interview_progression_events set explanation=case event_type
  when 'first_attempt' then 'Completed the first genuine station response.'
  when 'review' then 'Reviewed the transcript and feedback.'
  when 'retry' then 'Completed a targeted retry.'
  when 'improvement' then 'Recorded evidence of a Feedback Quest improvement.'
  when 'spaced_review' then 'Completed a due spaced review.'
  when 'consistency_week' then 'Completed five meaningful practice days this week.'
  when 'grace_week' then 'Used monthly grace protection.'
  else 'Interview practice reward.' end;
alter table public.interview_progression_events alter column explanation set not null;
alter table public.interview_progression_events
  add constraint interview_progression_events_explanation_check check (char_length(trim(explanation)) between 8 and 300),
  add constraint interview_progression_events_event_type_check check (event_type in ('first_attempt','review','retry','improvement','spaced_review','retention_bonus','circuit','consistency_week','grace_week'));

alter table public.interview_progression_profiles
  add column focus_tokens integer not null default 0 check (focus_tokens >= 0);

create table public.interview_focus_token_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_key text not null check (char_length(event_key) between 8 and 240),
  amount integer not null default 1 check (amount between 1 and 10),
  reason text not null check (char_length(trim(reason)) between 8 and 300),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object' and pg_column_size(metadata) <= 4096),
  created_at timestamptz not null default now(),
  unique(user_id,event_key)
);

create table public.interview_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_key text not null check (badge_key in ('balanced_thinker','specific_storyteller','feedback_in_action','retention_proven','reflective_practitioner','circuit_composure','adaptable_communicator')),
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence)='object' and pg_column_size(evidence) <= 4096),
  earned_at timestamptz not null default now(),
  unique(user_id,badge_key)
);

alter table public.interview_focus_token_events enable row level security;
alter table public.interview_badges enable row level security;
create policy "Read own interview Focus Tokens" on public.interview_focus_token_events for select to authenticated using (user_id=(select auth.uid()));
create policy "Read own interview badges" on public.interview_badges for select to authenticated using (user_id=(select auth.uid()));
revoke all on public.interview_focus_token_events,public.interview_badges from public,anon,authenticated;
grant select on public.interview_focus_token_events,public.interview_badges to authenticated;
grant all on public.interview_focus_token_events,public.interview_badges to service_role;
revoke update,delete on public.interview_progression_events,public.interview_focus_token_events,public.interview_badges from service_role;

create function public.sync_interview_badges(p_user uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if exists(select 1 from interview_feedback_quests where user_id=p_user and status='consolidated') then
    insert into interview_badges(user_id,badge_key,evidence) values(p_user,'feedback_in_action',jsonb_build_object('criterion','Consolidated a Feedback Quest')) on conflict(user_id,badge_key) do nothing;
  end if;
  if exists(select 1 from interview_feedback_quests where user_id=p_user and status='consolidated' and 'ethical_reasoning'=any(competencies) and behaviour ~* '(both sides|balanc|consider|judgement)') then
    insert into interview_badges(user_id,badge_key,evidence) values(p_user,'balanced_thinker',jsonb_build_object('criterion','Consolidated an ethical reasoning quest')) on conflict(user_id,badge_key) do nothing;
  end if;
  if exists(select 1 from interview_feedback_quests where user_id=p_user and status='consolidated' and competencies && array['motivation_for_medicine','reflection'] and behaviour ~* '(specific|example|experience)') then
    insert into interview_badges(user_id,badge_key,evidence) values(p_user,'specific_storyteller',jsonb_build_object('criterion','Consolidated a specific-example quest')) on conflict(user_id,badge_key) do nothing;
  end if;
  if exists(select 1 from interview_progression_events where user_id=p_user and event_type='retention_bonus') then
    insert into interview_badges(user_id,badge_key,evidence) values(p_user,'retention_proven',jsonb_build_object('criterion','Successfully completed a spaced review')) on conflict(user_id,badge_key) do nothing;
  end if;
  if (select count(distinct practice_log_id) from interview_competency_evidence where user_id=p_user and competency='reflection') >= 5 then
    insert into interview_badges(user_id,badge_key,evidence) values(p_user,'reflective_practitioner',jsonb_build_object('criterion','Built reflection evidence across five practices')) on conflict(user_id,badge_key) do nothing;
  end if;
  if exists(select 1 from interview_progression_events where user_id=p_user and event_type='circuit') then
    insert into interview_badges(user_id,badge_key,evidence) values(p_user,'circuit_composure',jsonb_build_object('criterion','Completed a full timed interview circuit')) on conflict(user_id,badge_key) do nothing;
  end if;
  if (select count(distinct practice_log_id) from interview_competency_evidence where user_id=p_user and competency='communication') >= 3
    and (select count(distinct practice_log_id) from interview_competency_evidence where user_id=p_user and competency='adaptability') >= 3 then
    insert into interview_badges(user_id,badge_key,evidence) values(p_user,'adaptable_communicator',jsonb_build_object('criterion','Built repeated communication and adaptability evidence')) on conflict(user_id,badge_key) do nothing;
  end if;
end $$;
revoke all on function public.sync_interview_badges(uuid) from public,anon,authenticated;

create function public.award_interview_focus_token(p_user uuid,p_event_key text,p_reason text,p_metadata jsonb default '{}'::jsonb) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
declare inserted integer;
begin
  insert into interview_focus_token_events(user_id,event_key,amount,reason,metadata)
  values(p_user,left(p_event_key,240),1,left(trim(p_reason),300),coalesce(p_metadata,'{}'::jsonb))
  on conflict(user_id,event_key) do nothing;
  get diagnostics inserted=row_count;
  if inserted=0 then return false; end if;
  insert into interview_progression_profiles(user_id,focus_tokens) values(p_user,1)
  on conflict(user_id) do update set focus_tokens=interview_progression_profiles.focus_tokens+1,updated_at=now();
  return true;
end $$;
revoke all on function public.award_interview_focus_token(uuid,text,text,jsonb) from public,anon,authenticated;

drop function public.award_interview_progression_xp(uuid,text,text,uuid,uuid,integer,jsonb);
create function public.award_interview_progression_xp(p_user uuid,p_event_key text,p_event_type text,p_daily uuid,p_log uuid,p_xp integer,p_metadata jsonb default '{}'::jsonb,p_explanation text default null) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
declare settings interview_progression_settings%rowtype; inserted integer; rule_xp integer; awarded_xp integer; today_total integer; activity_total integer; activity_cap integer; daily_awarded integer;
begin
  select * into settings from interview_progression_settings where id=true;
  rule_xp:=case p_event_type
    when 'first_attempt' then settings.first_attempt_xp when 'review' then settings.review_xp
    when 'retry' then settings.retry_xp when 'improvement' then settings.demonstrated_xp
    when 'spaced_review' then settings.spaced_review_xp when 'retention_bonus' then settings.retention_bonus_xp
    when 'circuit' then settings.circuit_xp when 'consistency_week' then settings.consistency_week_xp else 0 end;
  activity_cap:=case p_event_type when 'spaced_review' then settings.spaced_review_xp*3 when 'retention_bonus' then settings.retention_bonus_xp*3 else rule_xp end;
  select coalesce(sum(xp),0) into today_total from interview_progression_events where user_id=p_user and (created_at at time zone 'Australia/Sydney')::date=(now() at time zone 'Australia/Sydney')::date;
  select coalesce(sum(xp),0) into activity_total from interview_progression_events where user_id=p_user and event_type=p_event_type and (created_at at time zone 'Australia/Sydney')::date=(now() at time zone 'Australia/Sydney')::date;
  awarded_xp:=least(rule_xp,greatest(0,settings.total_daily_xp_cap-today_total),greatest(0,activity_cap-activity_total));
  if p_daily is not null then
    select xp_awarded into daily_awarded from interview_daily_stations where id=p_daily and user_id=p_user for update;
    awarded_xp:=least(awarded_xp,greatest(0,settings.daily_xp-coalesce(daily_awarded,0)));
  end if;
  insert into interview_progression_events(user_id,event_key,event_type,daily_station_id,practice_log_id,xp,metadata,explanation)
  values(p_user,left(p_event_key,240),p_event_type,p_daily,p_log,awarded_xp,coalesce(p_metadata,'{}'::jsonb),coalesce(nullif(trim(p_explanation),''),case p_event_type
    when 'first_attempt' then 'Completed the first genuine station response.' when 'review' then 'Reviewed the transcript and feedback.'
    when 'retry' then 'Completed a targeted retry.' when 'improvement' then 'Recorded evidence of a Feedback Quest improvement.'
    when 'spaced_review' then 'Completed a due spaced review.' when 'retention_bonus' then 'Demonstrated that the reviewed skill was retained.'
    when 'circuit' then 'Completed a full timed interview circuit.' when 'consistency_week' then 'Completed five meaningful practice days this week.'
    else 'Interview practice reward.' end))
  on conflict(user_id,event_key) do nothing;
  get diagnostics inserted=row_count;
  if inserted=0 then return false; end if;
  insert into interview_progression_profiles(user_id,total_xp) values(p_user,awarded_xp)
  on conflict(user_id) do update set total_xp=interview_progression_profiles.total_xp+excluded.total_xp,updated_at=now();
  if p_daily is not null then update interview_daily_stations set xp_awarded=xp_awarded+awarded_xp,updated_at=now() where id=p_daily and user_id=p_user; end if;
  perform sync_interview_badges(p_user);
  return true;
end $$;
revoke all on function public.award_interview_progression_xp(uuid,text,text,uuid,uuid,integer,jsonb,text) from public,anon,authenticated;

create or replace function public.capture_interview_progression() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare daily interview_daily_stations%rowtype; reviewrow interview_spaced_reviews%rowtype; settings interview_progression_settings%rowtype; minimum_seconds integer; evidence_competency text; week_day date; active_day_count integer; snapshot jsonb; mock_id text; mock_mode text; mock_total integer; completed_mock_parts integer;
begin
  if new.completed_at is null then return new; end if;
  select * into settings from interview_progression_settings where id=true;
  minimum_seconds:=case when new.format='mmi' then settings.minimum_mmi_seconds else settings.minimum_panel_seconds end;
  if new.duration_seconds < minimum_seconds then return new; end if;

  insert into interview_consistency_days(user_id,local_day,activity_types,first_completed_at)
  values(new.user_id,(new.completed_at at time zone 'Australia/Sydney')::date,array['meaningful_practice'],new.completed_at)
  on conflict(user_id,local_day) do update set activity_types=(select array_agg(distinct value) from unnest(interview_consistency_days.activity_types||excluded.activity_types) value),updated_at=now();

  week_day:=date_trunc('week',new.completed_at at time zone 'Australia/Sydney')::date;
  select count(*) into active_day_count from interview_consistency_days where user_id=new.user_id and local_day between week_day and week_day+6;
  if active_day_count>=settings.weekly_day_goal then
    perform award_interview_progression_xp(new.user_id,'week:'||week_day,'consistency_week',null,new.id,settings.consistency_week_xp,jsonb_build_object('week_start',week_day),'Completed five meaningful practice days this week.');
    perform award_interview_focus_token(new.user_id,'week:'||week_day||':token','Completed the weekly consistency goal.',jsonb_build_object('week_start',week_day));
  end if;

  if new.self_rating is not null then
    select * into reviewrow from interview_spaced_reviews where user_id=new.user_id and review_station_id=new.station_id and status in ('scheduled','due') order by due_day limit 1 for update;
    if reviewrow.id is not null then
      update interview_spaced_reviews set status='completed',completed_log_id=new.id,completed_at=new.completed_at,interval_stage=case when new.self_rating>=4 then least(4,interval_stage+1) when new.self_rating<=2 then greatest(0,interval_stage-1) else interval_stage end,updated_at=now() where id=reviewrow.id;
      update interview_consistency_days set activity_types=(select array_agg(distinct value) from unnest(activity_types||array['spaced_review']) value),updated_at=now() where user_id=new.user_id and local_day=(new.completed_at at time zone 'Australia/Sydney')::date;
      perform award_interview_progression_xp(new.user_id,'review:'||reviewrow.id,'spaced_review',null,new.id,settings.spaced_review_xp,jsonb_build_object('competency',reviewrow.competency,'interval_stage',reviewrow.interval_stage),'Completed a due spaced review.');
      if new.self_rating>=4 then perform award_interview_progression_xp(new.user_id,'review:'||reviewrow.id||':retained','retention_bonus',null,new.id,settings.retention_bonus_xp,jsonb_build_object('competency',reviewrow.competency),'Demonstrated that the reviewed skill was retained.'); end if;
      if reviewrow.interval_stage<=1 then perform award_interview_focus_token(new.user_id,'review:'||reviewrow.id||':token','Completed a difficult spaced review.',jsonb_build_object('competency',reviewrow.competency)); end if;
    end if;
  end if;

  if new.attempt_id is not null then
    select station_snapshot into snapshot from interview_attempts where id=new.attempt_id and user_id=new.user_id;
    mock_id:=snapshot#>>'{mock_session,id}'; mock_mode:=snapshot#>>'{mock_session,mode}'; mock_total:=nullif(snapshot#>>'{mock_session,total}','')::integer;
    if mock_id is not null and mock_mode='full' and ((new.format='mmi' and mock_total>=8) or (new.format='panel' and mock_total>=10)) then
      select count(*) into completed_mock_parts from interview_attempts a where a.user_id=new.user_id and a.upload_status='ready' and a.station_snapshot#>>'{mock_session,id}'=mock_id and a.duration_seconds>=case when a.format='mmi' then settings.minimum_mmi_seconds else settings.minimum_panel_seconds end;
      if completed_mock_parts>=mock_total then perform award_interview_progression_xp(new.user_id,'circuit:'||mock_id,'circuit',null,new.id,settings.circuit_xp,jsonb_build_object('format',new.format,'responses',mock_total),'Completed a full timed interview circuit.'); end if;
    end if;
  end if;

  select * into daily from interview_daily_stations where user_id=new.user_id and local_day=(new.completed_at at time zone 'Australia/Sydney')::date and station_id=new.station_id for update;
  if daily.id is null then perform sync_interview_badges(new.user_id); return new; end if;
  if new.source<>'recording' then perform sync_interview_badges(new.user_id); return new; end if;
  if daily.first_attempt_log_id is null then
    update interview_daily_stations set first_attempt_log_id=new.id,status='review',updated_at=now() where id=daily.id;
    perform award_interview_progression_xp(new.user_id,'daily:'||daily.id||':first','first_attempt',daily.id,new.id,settings.first_attempt_xp,jsonb_build_object('format',new.format));
  elsif daily.review_acknowledged_at is not null and daily.retry_log_id is null and daily.first_attempt_log_id<>new.id then
    update interview_daily_stations set retry_log_id=new.id,status='retry',updated_at=now() where id=daily.id;
    perform award_interview_progression_xp(new.user_id,'daily:'||daily.id||':retry','retry',daily.id,new.id,settings.retry_xp,jsonb_build_object('format',new.format));
    if daily.quest_id is not null then update interview_feedback_quests set status=case when status='assigned' then 'practised' else status end,practised_at=coalesce(practised_at,now()),updated_at=now() where id=daily.quest_id and user_id=new.user_id; end if;
  end if;
  foreach evidence_competency in array daily.competencies loop
    if new.self_rating is not null then delete from interview_competency_evidence e where e.practice_log_id=new.id and e.competency=evidence_competency and e.source='legacy'; end if;
    insert into interview_competency_evidence(user_id,competency,practice_log_id,source,evidence_score,observed_at)
    values(new.user_id,evidence_competency,new.id,case when new.self_rating is null then 'legacy' else 'self_rating' end,coalesce(new.self_rating::numeric/5,.5),new.completed_at)
    on conflict(practice_log_id,competency,source) do update set evidence_score=excluded.evidence_score,observed_at=excluded.observed_at;
  end loop;
  perform sync_interview_badges(new.user_id);
  return new;
end $$;

create or replace function public.record_interview_progression_action(p_attempt_id uuid,p_action text,p_evidence text default null) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=auth.uid(); logrow interview_practice_logs%rowtype; attemptrow interview_attempts%rowtype; daily interview_daily_stations%rowtype; settings interview_progression_settings%rowtype; quest interview_feedback_quests%rowtype; awarded boolean; token_awarded boolean:=false; quest_token_awarded boolean:=false;
begin
  if actor is null then return jsonb_build_object('status','unauthenticated'); end if;
  select * into logrow from interview_practice_logs where id=p_attempt_id and user_id=actor and completed_at is not null;
  if logrow.id is null then return jsonb_build_object('status','practice_missing'); end if;
  select * into daily from interview_daily_stations where user_id=actor and station_id=logrow.station_id and local_day=(logrow.completed_at at time zone 'Australia/Sydney')::date for update;
  if daily.id is null then return jsonb_build_object('status','daily_missing'); end if;
  select * into settings from interview_progression_settings where id=true;
  if p_action='review' then
    if daily.first_attempt_log_id<>logrow.id then return jsonb_build_object('status','first_attempt_required'); end if;
    select * into attemptrow from interview_attempts where id=p_attempt_id and user_id=actor;
    if logrow.source='recording' and (attemptrow.transcription_status<>'ready' or coalesce(length(trim(attemptrow.transcript)),0)<20) then return jsonb_build_object('status','transcript_not_ready'); end if;
    update interview_daily_stations set review_acknowledged_at=coalesce(review_acknowledged_at,now()),status=case when retry_log_id is null then 'retry' else status end,updated_at=now() where id=daily.id;
    awarded:=award_interview_progression_xp(actor,'daily:'||daily.id||':review','review',daily.id,logrow.id,settings.review_xp,'{}'::jsonb);
    return jsonb_build_object('status','reviewed','xp',case when awarded then settings.review_xp else 0 end);
  elsif p_action='demonstrate' then
    if daily.retry_log_id<>logrow.id then return jsonb_build_object('status','retry_required'); end if;
    if p_evidence is null or char_length(trim(p_evidence))<12 or char_length(p_evidence)>500 then return jsonb_build_object('status','evidence_required'); end if;
    update interview_daily_stations set improvement_evidence=trim(p_evidence),improvement_demonstrated=true,status='complete',updated_at=now() where id=daily.id;
    awarded:=award_interview_progression_xp(actor,'daily:'||daily.id||':improvement','improvement',daily.id,logrow.id,settings.demonstrated_xp,jsonb_build_object('evidence_recorded',true));
    if awarded then token_awarded:=award_interview_focus_token(actor,'daily:'||daily.id||':token','Completed the full Daily Station learning loop.',jsonb_build_object('daily_station_id',daily.id)); end if;
    if awarded and daily.quest_id is not null then
      update interview_feedback_quests set demonstration_count=demonstration_count+1,evidence_excerpt=trim(p_evidence),demonstrated_at=now(),status=case when demonstration_count+1>=2 then 'consolidated' else 'demonstrated_once' end,consolidated_at=case when demonstration_count+1>=2 then now() else consolidated_at end,updated_at=now() where id=daily.quest_id and user_id=actor returning * into quest;
      if quest.status='consolidated' then quest_token_awarded:=award_interview_focus_token(actor,'quest:'||quest.id||':token','Consolidated a Feedback Quest.',jsonb_build_object('quest_id',quest.id)); end if;
    end if;
    perform sync_interview_badges(actor);
    return jsonb_build_object('status','complete','xp',case when awarded then settings.demonstrated_xp else 0 end,'focus_tokens',(case when token_awarded then 1 else 0 end)+(case when quest_token_awarded then 1 else 0 end),'quest_status',quest.status);
  end if;
  return jsonb_build_object('status','invalid_action');
end $$;
revoke all on function public.record_interview_progression_action(uuid,text,text) from public,anon;
grant execute on function public.record_interview_progression_action(uuid,text,text) to authenticated,service_role;

-- Existing evidence earns its applicable badges immediately. XP and Focus
-- Tokens are intentionally prospective so migration time cannot look like a
-- burst of newly completed learning activity.
do $$declare reward_user uuid; begin
  for reward_user in select user_id from interview_progression_profiles loop
    perform sync_interview_badges(reward_user);
  end loop;
end $$;

comment on table public.interview_focus_token_events is 'Append-only, idempotent ledger of Focus Tokens earned through meaningful interview learning behaviours.';
comment on table public.interview_badges is 'Evidence-based interview badges. Criteria are evaluated from private learning records and never from raw score alone.';

commit;
