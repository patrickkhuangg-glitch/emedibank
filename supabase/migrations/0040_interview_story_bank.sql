begin;
create table public.interview_stories (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 title text not null check(char_length(btrim(title)) between 1 and 120),
 theme text not null check(theme in ('Teamwork','Communication','Empathy','Responsibility','Service','Growth','Motivation','Other')),
 context text not null check(char_length(btrim(context)) between 1 and 2000),
 actions text not null check(char_length(btrim(actions)) between 1 and 2000),
 reflection text not null check(char_length(btrim(reflection)) between 1 and 2000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 version integer not null default 1
);
create index interview_stories_owner_updated_idx on public.interview_stories(user_id,updated_at desc);
alter table public.interview_stories enable row level security;
create policy "Read own stories" on public.interview_stories for select to authenticated using(user_id=(select auth.uid()));
create policy "Create own stories" on public.interview_stories for insert to authenticated with check(user_id=(select auth.uid()));
create policy "Edit own stories" on public.interview_stories for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy "Delete own stories" on public.interview_stories for delete to authenticated using(user_id=(select auth.uid()));
revoke all on public.interview_stories from public,anon,authenticated;
grant select,delete on public.interview_stories to authenticated;
grant insert(id,user_id,title,theme,context,actions,reflection) on public.interview_stories to authenticated;
grant update(title,theme,context,actions,reflection) on public.interview_stories to authenticated;
grant all on public.interview_stories to service_role;
create function public.update_interview_story_version() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin new.created_at:=old.created_at;new.updated_at:=now();new.version:=old.version+1;return new;end $$;
create trigger interview_story_version before update on public.interview_stories for each row execute function public.update_interview_story_version();
revoke all on function public.update_interview_story_version() from public,anon,authenticated;
comment on table public.interview_stories is 'Private interview experiences and reflections. Owner-only access; version guards concurrent edits.';
commit;
