begin;
create table public.interview_practice_logs (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 station_id text not null check (char_length(station_id) between 1 and 160),
 format text not null check (format in ('mmi','panel')),
 source text not null check (source in ('rehearsal','recording')),
 attempt_id uuid unique references public.interview_attempts(id) on delete cascade,
 started_at timestamptz not null default now(),
 completed_at timestamptz,
 duration_seconds integer not null default 0 check(duration_seconds between 0 and 7200),
 self_rating smallint check(self_rating between 1 and 5),
 check ((source='rehearsal' and attempt_id is null) or (source='recording' and attempt_id=id)),
 check (completed_at is null or completed_at>=started_at),
 check (self_rating is null or completed_at is not null)
);
create index interview_practice_owner_completed_idx on public.interview_practice_logs(user_id,completed_at desc) where completed_at is not null;
alter table public.interview_practice_logs enable row level security;
create policy "Read own interview practice" on public.interview_practice_logs for select to authenticated using (user_id=(select auth.uid()));
revoke all on public.interview_practice_logs from public,anon,authenticated;
grant select on public.interview_practice_logs to authenticated;
grant all on public.interview_practice_logs to service_role;

-- Capture each saved recording once, including each response within a full mock.
-- The recording row already stores its save-start timestamp. No transcript,
-- media URL, marking credit, tutor feedback or question content is copied.
create function public.log_completed_interview_recording() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.upload_status='ready' then
  insert into public.interview_practice_logs(id,user_id,station_id,format,source,attempt_id,started_at,completed_at,duration_seconds)
  values(new.id,new.user_id,new.station_id,new.format,'recording',new.id,new.created_at,new.created_at,least(7200,greatest(0,new.duration_seconds)))
  on conflict(id) do nothing;
 end if;
 return new;
end $$;
revoke all on function public.log_completed_interview_recording() from public,anon,authenticated;
create trigger interview_recording_practice_log after insert or update of upload_status on public.interview_attempts for each row execute function public.log_completed_interview_recording();
insert into public.interview_practice_logs(id,user_id,station_id,format,source,attempt_id,started_at,completed_at,duration_seconds)
select id,user_id,station_id,format,'recording',id,created_at,created_at,least(7200,greatest(0,duration_seconds)) from public.interview_attempts where upload_status='ready'
on conflict(id) do nothing;
comment on table public.interview_practice_logs is 'Private practice history with optional student self-rating (1–5), separate from tutor marking. Unfinished rehearsals are excluded from progress. Recording deletions also delete their log.';
commit;
