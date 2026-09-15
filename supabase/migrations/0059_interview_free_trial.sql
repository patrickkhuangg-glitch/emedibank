begin;
-- Subscription trials must not bypass the restricted catalogue. Existing paid and
-- manually granted access stays intact; new webhook sync marks each entitlement.
alter table public.entitlements add column interview_trial_only boolean not null default false;
update public.entitlements t set interview_trial_only=true from public.exams e
where e.id=t.exam_id and e.kind='interview' and t.source<>'comp'
 and exists(select 1 from public.subscriptions s where s.user_id=t.user_id and s.status='trialing')
 and not exists(select 1 from public.subscriptions s where s.user_id=t.user_id and s.status in ('active','past_due'));
-- Disabled until the operator has configured the identity secret and reviewed rollout.
create table public.interview_trial_settings (
 id boolean primary key default true check(id), enabled boolean not null default false,
 processing_paused boolean not null default false,
 monthly_budget_cents integer not null default 5000 check(monthly_budget_cents>0),
 warning_cents integer not null default 4000 check(warning_cents>0),
 check(warning_cents<=monthly_budget_cents)
);
insert into public.interview_trial_settings(id) values(true);
create table public.interview_trial_claims (
 identity_hash text primary key check(identity_hash ~ '^[a-f0-9]{64}$'),
 user_id uuid unique references public.profiles(id) on delete set null,
 started_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '7 days',
 seconds_reserved integer not null default 0 check(seconds_reserved between 0 and 3600),
 mmi_session uuid, panel_session uuid, mmi_started_at timestamptz, panel_started_at timestamptz, uploaded_bytes bigint not null default 0 check(uploaded_bytes between 0 and 536870912)
);
comment on table public.interview_trial_claims is 'One lifetime trial per verified normalised email HMAC. Tombstones prevent re-registration grants; no raw email, transcript or recording stored here.';
create table public.interview_trial_usage (
 attempt_id uuid primary key references public.interview_attempts(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 seconds integer not null check(seconds>0 and seconds<=490),
 fingerprint text, provider_calls integer not null default 0,
 created_at timestamptz not null default now()
);
create unique index interview_trial_audio_once on public.interview_trial_usage(user_id,fingerprint) where fingerprint is not null;
create table public.interview_trial_spend (
 id uuid primary key default gen_random_uuid(), user_id uuid references public.profiles(id) on delete set null,
 attempt_id uuid references public.interview_attempts(id) on delete set null,
 stage text not null check(stage in ('transcribe','assess','audit','layout')), cents integer not null check(cents>0), created_at timestamptz not null default now()
);
create index interview_trial_spend_month on public.interview_trial_spend(created_at);
create table public.interview_trial_uploads(path text primary key,user_id uuid not null references public.profiles(id) on delete cascade,bytes bigint not null check(bytes>=0));
create function public.interview_full_access(p_user uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from profiles where id=p_user and role in ('admin','tutor')) or exists(select 1 from entitlements t join exams e on e.id=t.exam_id where t.user_id=p_user and e.kind='interview' and not t.interview_trial_only and (t.expires_at is null or t.expires_at>now()))
$$;
create function public.interview_trial_access(p_user uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare t interview_trial_claims; balance integer;begin
 select mmi_credits into balance from profiles where id=p_user;
 if interview_full_access(p_user) then return jsonb_build_object('kind','full','secondsRemaining',3600,'credits',coalesce(balance,0));end if;
 select * into t from interview_trial_claims where user_id=p_user;
 return jsonb_build_object('kind',case when t.user_id is not null and t.expires_at<=now() then 'expired' when not (select enabled from interview_trial_settings where id) then 'unavailable' when t.user_id is not null then 'active' else 'eligible' end,'expiresAt',t.expires_at,'secondsRemaining',3600-coalesce(t.seconds_reserved,0),'credits',coalesce(balance,0),'mmiUsed',t.mmi_session is not null,'panelUsed',t.panel_session is not null,'processingPaused',(select processing_paused or (select coalesce(sum(cents),0) from interview_trial_spend where created_at>=date_trunc('month',now() at time zone 'UTC') at time zone 'UTC')>=monthly_budget_cents from interview_trial_settings where id));
end $$;
create function public.start_interview_trial(p_user uuid,p_identity text) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare t interview_trial_claims;begin
 if interview_full_access(p_user) then return true;end if;
 if not (select enabled from interview_trial_settings where id) then return false;end if;
 if not exists(select 1 from auth.users u where u.id=p_user and nullif(to_jsonb(u)->>'email_confirmed_at','') is not null) then return false;end if;
 perform pg_advisory_xact_lock(hashtextextended('interview-trial:'||p_identity,0));
 select * into t from interview_trial_claims where identity_hash=p_identity or user_id=p_user;
 if found then return t.user_id=p_user and t.expires_at>now();end if;
 insert into interview_trial_claims(identity_hash,user_id) values(p_identity,p_user);
 update profiles set mmi_credits=mmi_credits+2 where id=p_user;
 return true;
end $$;
create function public.interview_trial_write_allowed(p_user uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select interview_full_access(p_user) or exists(select 1 from interview_trial_claims where user_id=p_user and expires_at>now()) or (not exists(select 1 from interview_trial_claims where user_id=p_user) and exists(select 1 from auth.users u where u.id=p_user and nullif(to_jsonb(u)->>'email_confirmed_at','') is not null))
$$;
-- Claim mock identities once, before signing a timed ticket. Retrying the same start id is safe.
create function public.claim_interview_trial_mock(p_user uuid,p_session uuid,p_format text) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare t interview_trial_claims;started timestamptz;begin
 select * into t from interview_trial_claims where user_id=p_user for update;
 if not found or t.expires_at<=now() or p_format not in ('mmi','panel') then return null;end if;
 if p_format='mmi' then
  if t.mmi_session is not null and t.mmi_session<>p_session then return null;end if;
  started:=coalesce(t.mmi_started_at,now());
  update interview_trial_claims set mmi_session=p_session,mmi_started_at=started where user_id=p_user;
 else
  if t.panel_session is not null and t.panel_session<>p_session then return null;end if;
  started:=coalesce(t.panel_started_at,now());
  update interview_trial_claims set panel_session=p_session,panel_started_at=started where user_id=p_user;
 end if;return jsonb_build_object('startedAt',floor(extract(epoch from started)*1000));
end $$;
-- Reservations survive attempt deletion; deleting saved work never refills trial minutes.
create function public.reserve_interview_trial_seconds(p_user uuid,p_attempt uuid,p_seconds integer) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare used integer;old_seconds integer;begin
 if interview_full_access(p_user) then return true;end if;
 if p_seconds is null or p_seconds<1 or p_seconds>490 then return false;end if;
 if not exists(select 1 from interview_attempts where id=p_attempt and user_id=p_user) then return false;end if;
 select seconds_reserved into used from interview_trial_claims where user_id=p_user and expires_at>now() for update;
 if not found then return false;end if;
 select seconds into old_seconds from interview_trial_usage where attempt_id=p_attempt;
 if found then return old_seconds=p_seconds;end if;
 if used+p_seconds>3600 then return false;end if;
 insert into interview_trial_usage(attempt_id,user_id,seconds) values(p_attempt,p_user,p_seconds);
 update interview_trial_claims set seconds_reserved=seconds_reserved+p_seconds where user_id=p_user;
 return true;
end $$;
-- All provider attempts are conservatively metered before the request, including retries.
create function public.admit_interview_trial_provider(p_user uuid,p_attempt uuid,p_stage text,p_seconds integer default 0,p_fingerprint text default null) returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare used integer;calls integer;cost integer;lim interview_trial_settings;old interview_trial_usage;begin
 if interview_full_access(p_user) then return 'full';end if;
 if not (select enabled from interview_trial_settings where id) then
  if exists(select 1 from interview_trial_claims where user_id=p_user) then return 'paused';else return 'full';end if;
 end if;
 if not exists(select 1 from interview_trial_claims where user_id=p_user) then return 'denied';end if;
 if not exists(select 1 from interview_attempts where id=p_attempt and user_id=p_user) then return 'denied';end if;
 perform pg_advisory_xact_lock(76124,19);
 select * into lim from interview_trial_settings where id;
 if lim.processing_paused then return 'paused';end if;
 if p_stage not in ('transcribe','assess','audit','layout') then return 'denied';end if;
 if p_stage='transcribe' then
  select * into old from interview_trial_usage where attempt_id=p_attempt for update;
  if not found or p_seconds<1 or p_seconds>490 or p_fingerprint is null then return 'denied';end if;
  if exists(select 1 from interview_trial_usage where user_id=p_user and fingerprint=p_fingerprint and attempt_id<>p_attempt) then return 'duplicate';end if;
  if old.provider_calls>=2 then return 'exhausted';end if;
  -- Only verified duration changes the final reservation, and never below measured use.
  select seconds_reserved into used from interview_trial_claims where user_id=p_user for update;
  if used-old.seconds+p_seconds>3600 then return 'minutes_exhausted';end if;
  update interview_trial_claims set seconds_reserved=used-old.seconds+p_seconds where user_id=p_user;
  update interview_trial_usage set seconds=p_seconds,fingerprint=p_fingerprint where attempt_id=p_attempt;
  cost:=greatest(1,ceil(p_seconds::numeric/60*0.6)::integer);
 else
  select count(*) into calls from interview_trial_spend where attempt_id=p_attempt and stage=p_stage;
  if calls>=2 then return 'exhausted';end if;
  if p_stage='layout' and not exists(select 1 from interview_trial_claims where user_id=p_user and expires_at>now()) then return 'expired';end if;
  cost:=case when p_stage='layout' then 10 else 50 end;
 end if;
 select coalesce(sum(cents),0) into used from interview_trial_spend where created_at>=date_trunc('month',now() at time zone 'UTC') at time zone 'UTC';
 if used+cost>lim.monthly_budget_cents then return 'budget';end if;
 if p_stage='transcribe' then update interview_trial_usage set provider_calls=provider_calls+1 where attempt_id=p_attempt;end if;
 insert into interview_trial_spend(user_id,attempt_id,stage,cents) values(p_user,p_attempt,p_stage,cost);
 return 'allowed';
end $$;
-- Prevent unbounded shell creation and protect quotas even if a route is missed.
create function public.guard_interview_trial_attempt() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not (select enabled from interview_trial_settings where id) or interview_full_access(new.user_id) then return new;end if;
 perform pg_advisory_xact_lock(hashtextextended('trial-attempt:'||new.user_id::text,0));
 if not interview_trial_write_allowed(new.user_id) then raise exception 'trial_inactive';end if;
 if (select count(*) from interview_attempts where user_id=new.user_id and created_at>now()-interval '7 days')>=60 then raise exception 'trial_upload_limit';end if;
 return new;
end $$;
create trigger interview_trial_attempt before insert on public.interview_attempts for each row execute function public.guard_interview_trial_attempt();
-- Direct Storage uploads cannot bypass the cumulative 512 MiB trial byte allowance.
create function public.guard_interview_trial_storage() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare owner_id uuid;amount bigint;maximum bigint;previous bigint:=0;t interview_trial_claims;begin
 if new.bucket_id<>'interview-recordings' or not (select enabled from interview_trial_settings where id) then return new;end if;
 select user_id into owner_id from interview_attempts where new.name in (recording_path,transcription_audio_path) limit 1;
 if owner_id is null or interview_full_access(owner_id) then return new;end if;
 select * into t from interview_trial_claims where user_id=owner_id for update;
 if not found or t.expires_at<=now() then raise exception 'trial_inactive';end if;
 select case when new.name=transcription_audio_path or media_kind='audio' then 25165824 else 134217728 end into maximum from interview_attempts where user_id=owner_id and new.name in (recording_path,transcription_audio_path) limit 1;
 amount:=case when new.metadata->>'size' ~ '^[0-9]{1,12}$' then (new.metadata->>'size')::bigint else 0 end;
 if amount>maximum then raise exception 'trial_file_too_large';end if;
 select bytes into previous from interview_trial_uploads where path=new.name;
 previous:=coalesce(previous,0);
 if t.uploaded_bytes+greatest(0,amount-previous)>536870912 then raise exception 'trial_storage_limit';end if;
 update interview_trial_claims set uploaded_bytes=uploaded_bytes+greatest(0,amount-previous) where user_id=owner_id;
 insert into interview_trial_uploads(path,user_id,bytes) values(new.name,owner_id,amount) on conflict(path) do update set bytes=greatest(interview_trial_uploads.bytes,excluded.bytes);
 return new;
end $$;
create trigger interview_trial_storage before insert or update on storage.objects for each row execute function public.guard_interview_trial_storage();
-- No new notes/stories after expiry, including direct authenticated table access.
create function public.guard_interview_trial_note() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if (select enabled from interview_trial_settings where id) and not interview_full_access(new.user_id) then
  if not interview_trial_write_allowed(new.user_id) then raise exception 'trial_inactive';end if;
  perform pg_advisory_xact_lock(hashtextextended('trial-notes:'||new.user_id::text,0));
  if tg_op='INSERT' and ((tg_table_name='interview_stories' and (select count(*) from interview_stories where user_id=new.user_id)>=100) or (tg_table_name='interview_study_notes' and (select count(*) from interview_study_notes where user_id=new.user_id)>=500)) then raise exception 'trial_notes_limit';end if;
 end if;return new;
end $$;
create trigger interview_trial_story_write before insert or update on public.interview_stories for each row execute function public.guard_interview_trial_note();
create trigger interview_trial_note_write before insert or update on public.interview_study_notes for each row execute function public.guard_interview_trial_note();

alter table public.interview_trial_settings enable row level security;
alter table public.interview_trial_claims enable row level security;
alter table public.interview_trial_usage enable row level security;
alter table public.interview_trial_spend enable row level security;
alter table public.interview_trial_uploads enable row level security;
revoke all on public.interview_trial_settings,public.interview_trial_claims,public.interview_trial_usage,public.interview_trial_spend,public.interview_trial_uploads from public,anon,authenticated;
grant all on public.interview_trial_settings,public.interview_trial_claims,public.interview_trial_usage,public.interview_trial_spend,public.interview_trial_uploads to service_role;
revoke all on function public.interview_full_access(uuid),public.interview_trial_access(uuid),public.start_interview_trial(uuid,text),public.interview_trial_write_allowed(uuid),public.claim_interview_trial_mock(uuid,uuid,text),public.reserve_interview_trial_seconds(uuid,uuid,integer),public.admit_interview_trial_provider(uuid,uuid,text,integer,text),public.guard_interview_trial_attempt(),public.guard_interview_trial_storage(),public.guard_interview_trial_note() from public,anon,authenticated;
grant execute on function public.interview_full_access(uuid),public.interview_trial_access(uuid),public.start_interview_trial(uuid,text),public.interview_trial_write_allowed(uuid),public.claim_interview_trial_mock(uuid,uuid,text),public.reserve_interview_trial_seconds(uuid,uuid,integer),public.admit_interview_trial_provider(uuid,uuid,text,integer,text) to service_role;
commit;
