-- 0006_question_tags.sql — Phase 2+: tag questions by type/skill for session filtering.
-- Sections are already modelled by subtests; tags add question-type/topic filtering.
alter table public.questions add column if not exists tags text[] not null default '{}';
create index if not exists questions_tags_idx on public.questions using gin (tags);
