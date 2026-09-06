-- Server-owned, rolling quotas. Completing/deleting an attempt never refunds usage.
begin;
create table public.interview_security_limits (
  id boolean primary key default true check (id),
  recording_daily_limit integer not null default 10 check (recording_daily_limit > 0),
  recording_storage_bytes bigint not null default 2147483648 check (recording_storage_bytes > 0),
  transcription_daily_limit integer not null default 20 check (transcription_daily_limit > 0),
  transcription_global_daily_limit integer not null default 500 check (transcription_global_daily_limit > 0)
);
insert into public.interview_security_limits(id) values(true);
create table public.interview_resource_usage (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  resource text not null check (resource in ('recording','transcription')),
  created_at timestamptz not null default now()
);
create index interview_resource_usage_user_window on public.interview_resource_usage(user_id,resource,created_at);
create index interview_resource_usage_global_window on public.interview_resource_usage(resource,created_at);
alter table public.interview_security_limits enable row level security;
alter table public.interview_resource_usage enable row level security;
revoke all on public.interview_security_limits,public.interview_resource_usage from public,anon,authenticated;
grant select,update on public.interview_security_limits to service_role;
grant select on public.interview_resource_usage to service_role;

-- Count recent pre-migration attempts too; existing objects are measured below.
insert into public.interview_resource_usage(user_id,resource,created_at)
select user_id,'recording',created_at from public.interview_attempts where created_at > now()-interval '24 hours';

create function public.enforce_interview_recording_quota() returns trigger
language plpgsql security definer set search_path='' as $$
declare limits public.interview_security_limits; used_bytes numeric; reserved_bytes numeric;
  object_limit constant bigint := 157286400; -- bucket limit: 150 MiB for either object
begin
  perform pg_advisory_xact_lock(hashtextextended('interview-recording:'||new.user_id::text,0));
  select * into strict limits from public.interview_security_limits where id;
  if (select count(*) from public.interview_resource_usage where user_id=new.user_id
      and resource='recording' and created_at > now()-interval '24 hours') >= limits.recording_daily_limit then
    raise exception 'recording_daily_limit';
  end if;

  -- Storage metadata is written by Storage, not taken from the browser. Unknown
  -- sizes reserve the entire object allowance. Include legacy/orphaned objects.
  with objects as (
    select name, case when metadata->>'size' ~ '^[0-9]{1,20}$'
      then (metadata->>'size')::numeric else object_limit end as bytes
    from storage.objects where bucket_id='interview-recordings'
      and (storage.foldername(name))[1]=new.user_id::text
  ), pending as (
    select distinct path from public.interview_attempts a
    cross join lateral unnest(array[a.recording_path,a.transcription_audio_path]) path
    where a.user_id=new.user_id and a.upload_status in ('awaiting_upload','uploading')
      and a.created_at > now()-interval '24 hours' and path is not null
  )
  select coalesce((select sum(bytes) from objects),0),
    coalesce((select sum(greatest(0,object_limit-coalesce(o.bytes,0)))
      from pending p left join objects o on o.name=p.path),0)
  into used_bytes,reserved_bytes;
  if used_bytes+reserved_bytes+object_limit*(1+case when new.transcription_audio_path is null then 0 else 1 end)
      > limits.recording_storage_bytes then raise exception 'recording_storage_limit'; end if;

  insert into public.interview_resource_usage(user_id,resource) values(new.user_id,'recording');
  return new;
end $$;
revoke all on function public.enforce_interview_recording_quota() from public,anon,authenticated;
create trigger enforce_interview_recording_quota before insert on public.interview_attempts
for each row execute function public.enforce_interview_recording_quota();

-- Charge every provider invocation, including retries, under one global lock.
create function public.consume_interview_transcription(p_user_id uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare limits public.interview_security_limits;
begin
  if p_user_id is null then return false; end if;
  perform pg_advisory_xact_lock(hashtextextended('interview-transcription-global',0));
  select * into strict limits from public.interview_security_limits where id;
  if (select count(*) from public.interview_resource_usage where resource='transcription'
      and created_at > now()-interval '24 hours') >= limits.transcription_global_daily_limit
    or (select count(*) from public.interview_resource_usage where user_id=p_user_id
      and resource='transcription' and created_at > now()-interval '24 hours') >= limits.transcription_daily_limit then
    return false;
  end if;
  insert into public.interview_resource_usage(user_id,resource) values(p_user_id,'transcription');
  return true;
end $$;

-- A spent quota delays work without consuming the job's failure/retry budget.
create function public.defer_interview_transcription(p_job_id uuid,p_worker text) returns boolean
language plpgsql security definer set search_path='' as $$
declare j public.interview_processing_jobs;
begin
  select * into j from public.interview_processing_jobs where id=p_job_id;
  if not found then return false; end if;
  perform 1 from public.interview_attempts where id=j.attempt_id for update;
  select * into j from public.interview_processing_jobs where id=p_job_id for update;
  if j.status<>'running' or j.job_type<>'transcribe' or j.locked_by is distinct from p_worker then return false; end if;
  update public.interview_processing_jobs set status='queued',available_at=now()+interval '1 hour',
    attempt_count=greatest(0,attempt_count-1),locked_at=null,locked_by=null,
    last_error_code='transcription_quota',last_error_message='Daily transcription limit reached; automatically retrying later.',updated_at=now()
    where id=j.id;
  return true;
end $$;
revoke all on function public.consume_interview_transcription(uuid),public.defer_interview_transcription(uuid,text) from public,anon,authenticated;
grant execute on function public.consume_interview_transcription(uuid),public.defer_interview_transcription(uuid,text) to service_role;

-- Single-use tickets bind app CAPTCHA/rate-limit approval to Auth account creation.
create table public.signup_authorizations (
  token_hash text primary key check (token_hash ~ '^[a-f0-9]{64}$'),
  email text not null,
  expires_at timestamptz not null default now()+interval '10 minutes'
);
create index signup_authorizations_expiry on public.signup_authorizations(expires_at);
alter table public.signup_authorizations enable row level security;
revoke all on public.signup_authorizations from public,anon,authenticated;
create function public.authorize_signup(p_email text,p_token_hash text) returns void
language plpgsql security definer set search_path='' as $$
begin
  if p_email is null or length(trim(p_email)) not between 3 and 320 then raise exception 'invalid_email'; end if;
  delete from public.signup_authorizations where expires_at < now();
  insert into public.signup_authorizations(token_hash,email) values(p_token_hash,lower(trim(p_email)));
end $$;
revoke all on function public.authorize_signup(text,text) from public,anon,authenticated;
grant execute on function public.authorize_signup(text,text) to service_role;

create function public.require_signup_authorization() returns trigger
language plpgsql security definer set search_path='' as $$
declare token text;
begin
  token := new.raw_user_meta_data->>'signup_authorization';
  new.raw_user_meta_data := coalesce(new.raw_user_meta_data,'{}'::jsonb)-'signup_authorization';
  -- Only Auth can set app metadata; never trust the user-metadata provider field.
  if new.raw_app_meta_data->>'provider' = 'google' then return new; end if;
  if token is null or token !~ '^[a-f0-9]{64}$' then raise exception 'signup_authorization_required'; end if;
  delete from public.signup_authorizations where token_hash=encode(sha256(convert_to(token,'UTF8')),'hex')
    and email=lower(trim(new.email)) and expires_at > now();
  if not found then raise exception 'signup_authorization_required'; end if;
  return new;
end $$;
revoke all on function public.require_signup_authorization() from public,anon,authenticated;
-- Activated separately in 0036 so the ticket-aware app can be deployed first.
commit;
