-- 0021 — Private recordings for interview-practice sessions.
-- Audio belongs only to the student who recorded it; storage paths are scoped to
-- their auth UUID and the bucket is never public.

create table public.interview_attempts (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  format              text not null check (format in ('mmi', 'panel')),
  station_id          text not null,
  station_title       text not null,
  questions           jsonb not null default '[]'::jsonb,
  duration_seconds    integer not null default 0 check (duration_seconds between 0 and 480),
  recording_path      text not null unique,
  recording_mime_type text not null,
  created_at          timestamptz not null default now()
);

create index interview_attempts_user_created_idx
  on public.interview_attempts (user_id, created_at desc);

alter table public.interview_attempts enable row level security;

create policy "Users read their own interview attempts"
  on public.interview_attempts for select
  using (auth.uid() = user_id);

create policy "Users insert their own interview attempts"
  on public.interview_attempts for insert
  with check (auth.uid() = user_id);

create policy "Users delete their own interview attempts"
  on public.interview_attempts for delete
  using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('interview-recordings', 'interview-recordings', false)
on conflict (id) do nothing;

create policy "Users upload their own interview recordings"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'interview-recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users read their own interview recordings"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'interview-recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users delete their own interview recordings"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'interview-recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

comment on table public.interview_attempts is
  'Private recordings made during MMI or panel interview practice.';
