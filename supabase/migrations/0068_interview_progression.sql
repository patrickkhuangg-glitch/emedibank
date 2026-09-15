begin;

-- Interview progression rewards deliberate practice. It is intentionally
-- separate from the speed/correctness XP used by multiple-choice exams.
create table public.interview_progression_settings (
  id boolean primary key default true check (id),
  daily_xp integer not null default 100 check (daily_xp between 1 and 10000),
  first_attempt_xp integer not null default 30 check (first_attempt_xp >= 0),
  review_xp integer not null default 20 check (review_xp >= 0),
  retry_xp integer not null default 40 check (retry_xp >= 0),
  demonstrated_xp integer not null default 10 check (demonstrated_xp >= 0),
  minimum_mmi_seconds integer not null default 45 check (minimum_mmi_seconds between 15 and 480),
  minimum_panel_seconds integer not null default 30 check (minimum_panel_seconds between 15 and 120),
  review_intervals_days integer[] not null default array[1,3,7,14,30],
  weekly_day_goal integer not null default 5 check (weekly_day_goal between 1 and 7),
  maximum_active_quests integer not null default 3 check (maximum_active_quests between 1 and 5),
  updated_at timestamptz not null default now(),
  check (first_attempt_xp + review_xp + retry_xp + demonstrated_xp = daily_xp),
  check (cardinality(review_intervals_days) = 5)
);
insert into public.interview_progression_settings(id) values(true);

create table public.interview_progression_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  total_xp integer not null default 0 check (total_xp >= 0),
  current_consistency_weeks integer not null default 0 check (current_consistency_weeks >= 0),
  best_consistency_weeks integer not null default 0 check (best_consistency_weeks >= current_consistency_weeks),
  grace_month date,
  grace_used boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.interview_feedback_quests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  behaviour text not null check (char_length(trim(behaviour)) between 12 and 280),
  competencies text[] not null check (cardinality(competencies) between 1 and 3),
  status text not null default 'assigned' check (status in ('assigned','practised','demonstrated_once','consolidated','replaced')),
  source text not null default 'automated' check (source in ('automated','tutor','legacy')),
  source_attempt_id uuid references public.interview_attempts(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  tutor_override boolean not null default false,
  demonstration_count integer not null default 0 check (demonstration_count between 0 and 100),
  evidence_excerpt text check (evidence_excerpt is null or char_length(evidence_excerpt) <= 500),
  accepted_at timestamptz,
  practised_at timestamptz,
  demonstrated_at timestamptz,
  consolidated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index interview_quests_user_active_idx on public.interview_feedback_quests(user_id,created_at desc) where status in ('assigned','practised','demonstrated_once');
create unique index interview_tutor_quest_source_idx on public.interview_feedback_quests(source_attempt_id) where source='tutor' and source_attempt_id is not null;

create table public.interview_daily_stations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  local_day date not null,
  station_id text not null check (char_length(station_id) between 1 and 160),
  format text not null check (format in ('mmi','panel')),
  competencies text[] not null check (cardinality(competencies) between 1 and 3),
  reason text not null check (char_length(reason) between 1 and 300),
  quest_id uuid references public.interview_feedback_quests(id) on delete set null,
  status text not null default 'answer' check (status in ('answer','review','retry','complete')),
  first_attempt_log_id uuid references public.interview_practice_logs(id) on delete set null,
  review_acknowledged_at timestamptz,
  retry_log_id uuid references public.interview_practice_logs(id) on delete set null,
  improvement_evidence text check (improvement_evidence is null or char_length(improvement_evidence) <= 500),
  improvement_demonstrated boolean not null default false,
  xp_awarded integer not null default 0 check (xp_awarded >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,local_day),
  check (retry_log_id is null or first_attempt_log_id is not null),
  check (review_acknowledged_at is null or first_attempt_log_id is not null)
);
create index interview_daily_station_user_idx on public.interview_daily_stations(user_id,local_day desc);

create table public.interview_progression_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_key text not null check (char_length(event_key) between 8 and 240),
  event_type text not null check (event_type in ('first_attempt','review','retry','improvement','spaced_review','consistency_week','grace_week')),
  daily_station_id uuid references public.interview_daily_stations(id) on delete set null,
  practice_log_id uuid references public.interview_practice_logs(id) on delete set null,
  xp integer not null default 0 check (xp between 0 and 10000),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object' and pg_column_size(metadata) <= 4096),
  created_at timestamptz not null default now(),
  unique(user_id,event_key)
);

create table public.interview_consistency_days (
  user_id uuid not null references public.profiles(id) on delete cascade,
  local_day date not null,
  activity_types text[] not null default '{}',
  first_completed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(user_id,local_day)
);

create table public.interview_competency_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  competency text not null check (competency in ('communication','empathy','ethical_reasoning','teamwork','motivation_for_medicine','reflection','healthcare_awareness','adaptability')),
  practice_log_id uuid references public.interview_practice_logs(id) on delete cascade,
  quest_id uuid references public.interview_feedback_quests(id) on delete set null,
  source text not null check (source in ('self_rating','automated','tutor','legacy')),
  evidence_score numeric(4,3) not null check (evidence_score between 0 and 1),
  behaviour text check (behaviour is null or char_length(behaviour) <= 400),
  evidence_excerpt text check (evidence_excerpt is null or char_length(evidence_excerpt) <= 500),
  observed_at timestamptz not null default now(),
  unique(practice_log_id,competency,source)
);
create index interview_competency_evidence_user_idx on public.interview_competency_evidence(user_id,competency,observed_at desc);

create table public.interview_spaced_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  competency text not null check (competency in ('communication','empathy','ethical_reasoning','teamwork','motivation_for_medicine','reflection','healthcare_awareness','adaptability')),
  source_station_id text not null,
  review_station_id text not null,
  reason text not null check (char_length(reason) between 1 and 300),
  interval_stage smallint not null default 0 check (interval_stage between 0 and 4),
  due_day date not null,
  status text not null default 'due' check (status in ('scheduled','due','completed','superseded')),
  completed_log_id uuid references public.interview_practice_logs(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index interview_one_active_review_per_competency on public.interview_spaced_reviews(user_id,competency) where status in ('scheduled','due');
create index interview_reviews_due_idx on public.interview_spaced_reviews(user_id,due_day) where status in ('scheduled','due');

alter table public.interview_progression_profiles enable row level security;
alter table public.interview_feedback_quests enable row level security;
alter table public.interview_daily_stations enable row level security;
alter table public.interview_progression_events enable row level security;
alter table public.interview_consistency_days enable row level security;
alter table public.interview_competency_evidence enable row level security;
alter table public.interview_spaced_reviews enable row level security;

create policy "Read own interview progression profile" on public.interview_progression_profiles for select to authenticated using (user_id=(select auth.uid()));
create policy "Read own interview quests" on public.interview_feedback_quests for select to authenticated using (user_id=(select auth.uid()));
create policy "Read own daily stations" on public.interview_daily_stations for select to authenticated using (user_id=(select auth.uid()));
create policy "Read own interview XP events" on public.interview_progression_events for select to authenticated using (user_id=(select auth.uid()));
create policy "Read own interview consistency" on public.interview_consistency_days for select to authenticated using (user_id=(select auth.uid()));
create policy "Read own interview competency evidence" on public.interview_competency_evidence for select to authenticated using (user_id=(select auth.uid()));
create policy "Read own interview reviews" on public.interview_spaced_reviews for select to authenticated using (user_id=(select auth.uid()));

revoke all on public.interview_progression_settings,public.interview_progression_profiles,public.interview_feedback_quests,public.interview_daily_stations,public.interview_progression_events,public.interview_consistency_days,public.interview_competency_evidence,public.interview_spaced_reviews from public,anon,authenticated;
grant select on public.interview_progression_settings,public.interview_progression_profiles,public.interview_feedback_quests,public.interview_daily_stations,public.interview_progression_events,public.interview_consistency_days,public.interview_competency_evidence,public.interview_spaced_reviews to authenticated;
grant all on public.interview_progression_settings,public.interview_progression_profiles,public.interview_feedback_quests,public.interview_daily_stations,public.interview_progression_events,public.interview_consistency_days,public.interview_competency_evidence,public.interview_spaced_reviews to service_role;

create function public.award_interview_progression_xp(p_user uuid,p_event_key text,p_event_type text,p_daily uuid,p_log uuid,p_xp integer,p_metadata jsonb default '{}'::jsonb) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
declare inserted integer;
begin
  insert into interview_progression_events(user_id,event_key,event_type,daily_station_id,practice_log_id,xp,metadata)
  values(p_user,left(p_event_key,240),p_event_type,p_daily,p_log,greatest(0,p_xp),coalesce(p_metadata,'{}'::jsonb))
  on conflict(user_id,event_key) do nothing;
  get diagnostics inserted=row_count;
  if inserted=0 then return false; end if;
  insert into interview_progression_profiles(user_id,total_xp) values(p_user,greatest(0,p_xp))
  on conflict(user_id) do update set total_xp=interview_progression_profiles.total_xp+excluded.total_xp,updated_at=now();
  if p_daily is not null then update interview_daily_stations set xp_awarded=xp_awarded+greatest(0,p_xp),updated_at=now() where id=p_daily and user_id=p_user; end if;
  return true;
end $$;
revoke all on function public.award_interview_progression_xp(uuid,text,text,uuid,uuid,integer,jsonb) from public,anon,authenticated;

create function public.capture_interview_progression() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare daily interview_daily_stations%rowtype; reviewrow interview_spaced_reviews%rowtype; settings interview_progression_settings%rowtype; minimum_seconds integer; evidence_competency text;
begin
  if new.completed_at is null then return new; end if;
  select * into settings from interview_progression_settings where id=true;
  minimum_seconds:=case when new.format='mmi' then settings.minimum_mmi_seconds else settings.minimum_panel_seconds end;
  if new.duration_seconds < minimum_seconds then return new; end if;

  insert into interview_consistency_days(user_id,local_day,activity_types,first_completed_at)
  values(new.user_id,(new.completed_at at time zone 'Australia/Sydney')::date,array['meaningful_practice'],new.completed_at)
  on conflict(user_id,local_day) do update set activity_types=(select array_agg(distinct value) from unnest(interview_consistency_days.activity_types||excluded.activity_types) value),updated_at=now();

  -- A spaced review is successful only after the student supplies a rating.
  -- A lower rating shortens the next application-selected interval; a stronger
  -- one advances it. The next scenario is deliberately chosen outside SQL.
  if new.self_rating is not null then
    select * into reviewrow from interview_spaced_reviews where user_id=new.user_id and review_station_id=new.station_id and status in ('scheduled','due') order by due_day limit 1 for update;
    if reviewrow.id is not null then
      update interview_spaced_reviews set status='completed',completed_log_id=new.id,completed_at=new.completed_at,interval_stage=case when new.self_rating>=4 then least(4,interval_stage+1) when new.self_rating<=2 then greatest(0,interval_stage-1) else interval_stage end,updated_at=now() where id=reviewrow.id;
      perform award_interview_progression_xp(new.user_id,'review:'||reviewrow.id,'spaced_review',null,new.id,0,jsonb_build_object('competency',reviewrow.competency,'interval_stage',reviewrow.interval_stage));
    end if;
  end if;

  select * into daily from interview_daily_stations where user_id=new.user_id and local_day=(new.completed_at at time zone 'Australia/Sydney')::date and station_id=new.station_id for update;
  if daily.id is null then return new; end if;
  -- A Daily Station must support transcript review and a like-for-like retry.
  -- Unrecorded rehearsals still count toward consistency, but do not advance XP.
  if new.source<>'recording' then return new; end if;
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
  return new;
end $$;
revoke all on function public.capture_interview_progression() from public,anon,authenticated;
create trigger capture_interview_progression_after_log after insert or update of completed_at,self_rating on public.interview_practice_logs for each row execute function public.capture_interview_progression();

-- Released human-reviewed feedback becomes the highest-priority quest. Only a
-- short action and competency labels are copied; full feedback and transcripts
-- remain in their existing private tables.
create function public.capture_tutor_feedback_quest() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare action_text text; strength_text text; new_quest_id uuid; competencies text[]; evidence_competency text; feedback_score numeric;
begin
  if new.marking_status<>'released' or new.approved_feedback is null or (old.marking_status='released' and old.approved_feedback is not distinct from new.approved_feedback) then return new; end if;
  action_text:=coalesce(new.approved_feedback#>>'{priorities,0,text}',new.approved_feedback#>>'{priorities,0}',new.approved_feedback#>>'{practice_task}');
  action_text:=left(trim(action_text),280);
  strength_text:=left(trim(coalesce(new.approved_feedback#>>'{strengths,0,text}',new.approved_feedback#>>'{strengths,0}')),400);
  if coalesce(length(action_text),0)<12 then return new; end if;
  select d.competencies into competencies from interview_daily_stations d where d.user_id=new.user_id and d.station_id=new.station_id order by d.local_day desc limit 1;
  competencies:=coalesce(competencies,array['communication']);
  update interview_feedback_quests set status='replaced',updated_at=now() where user_id=new.user_id and status in ('assigned','practised','demonstrated_once');
  insert into interview_feedback_quests(user_id,behaviour,competencies,status,source,source_attempt_id,tutor_override,accepted_at)
  values(new.user_id,action_text,competencies,'assigned','tutor',new.id,true,now())
  on conflict(source_attempt_id) where source='tutor' and source_attempt_id is not null do update set behaviour=excluded.behaviour,competencies=excluded.competencies,status='assigned',tutor_override=true,updated_at=now()
  returning id into new_quest_id;
  feedback_score:=coalesce(nullif(new.approved_feedback#>>'{global,score}','')::numeric,nullif(new.approved_feedback#>>'{overall,score}','')::numeric,nullif(new.approved_feedback#>>'{global_rating,score}','')::numeric);
  if feedback_score is not null then
    foreach evidence_competency in array competencies loop
      insert into interview_competency_evidence(user_id,competency,practice_log_id,quest_id,source,evidence_score,behaviour,evidence_excerpt,observed_at)
      values(new.user_id,evidence_competency,new.id,new_quest_id,'tutor',least(1,greatest(0,feedback_score/7)),nullif(strength_text,''),action_text,now())
      on conflict(practice_log_id,competency,source) do update set quest_id=excluded.quest_id,evidence_score=excluded.evidence_score,behaviour=excluded.behaviour,evidence_excerpt=excluded.evidence_excerpt,observed_at=excluded.observed_at;
    end loop;
  end if;
  update interview_daily_stations set quest_id=new_quest_id,updated_at=now() where id=(select id from interview_daily_stations where user_id=new.user_id order by local_day desc limit 1);
  return new;
end $$;
revoke all on function public.capture_tutor_feedback_quest() from public,anon,authenticated;
create trigger capture_tutor_feedback_quest_after_release after update of marking_status,approved_feedback on public.interview_attempts for each row execute function public.capture_tutor_feedback_quest();

create function public.record_interview_progression_action(p_attempt_id uuid,p_action text,p_evidence text default null) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=auth.uid(); logrow interview_practice_logs%rowtype; attemptrow interview_attempts%rowtype; daily interview_daily_stations%rowtype; settings interview_progression_settings%rowtype; quest interview_feedback_quests%rowtype; awarded boolean;
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
    if awarded and daily.quest_id is not null then
      update interview_feedback_quests set demonstration_count=demonstration_count+1,evidence_excerpt=trim(p_evidence),demonstrated_at=now(),status=case when demonstration_count+1>=2 then 'consolidated' else 'demonstrated_once' end,consolidated_at=case when demonstration_count+1>=2 then now() else consolidated_at end,updated_at=now() where id=daily.quest_id and user_id=actor returning * into quest;
    end if;
    return jsonb_build_object('status','complete','xp',case when awarded then settings.demonstrated_xp else 0 end,'quest_status',quest.status);
  end if;
  return jsonb_build_object('status','invalid_action');
end $$;
revoke all on function public.record_interview_progression_action(uuid,text,text) from public,anon;
grant execute on function public.record_interview_progression_action(uuid,text,text) to authenticated,service_role;

comment on table public.interview_daily_stations is 'One stable local-day interview assignment and its capped deliberate-practice XP loop.';
comment on table public.interview_competency_evidence is 'Private, attributable evidence used for decayed multi-attempt mastery. Excerpts never enter analytics.';
comment on table public.interview_spaced_reviews is 'Competency-level review queue; review_station_id must differ from the source station in application validation.';
comment on table public.interview_progression_events is 'Idempotent XP ledger. Unique event keys prevent refreshes and duplicate requests from awarding twice.';

commit;
