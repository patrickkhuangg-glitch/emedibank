-- 0004_subtests_seed.sql — Phase 1: seed each exam's subtests.
--
-- Structures confirmed with the owner. UCAT no longer has Abstract Reasoning.
-- ISAT has its two reasoning sections. Interviews are intentionally left without
-- subtests for now ("nothing for interviews").
--
-- All seeded with is_free = false (everything gated). The free tier is set by
-- admins toggling is_free in the admin screen — nothing is hardcoded free here.
-- (The intended free offering — 2 full practice exams per exam — is a mock-exam
-- concept that arrives with the exam engine in a later phase.)

insert into public.subtests (exam_id, name, slug, is_free, sort_order)
select e.id, v.name, v.slug, false, v.sort_order
from public.exams e
join (values
  ('ucat',   'Verbal Reasoning',       'verbal-reasoning',       1),
  ('ucat',   'Decision Making',        'decision-making',        2),
  ('ucat',   'Quantitative Reasoning', 'quantitative-reasoning', 3),
  ('ucat',   'Situational Judgement',  'situational-judgement',  4),
  ('gamsat', 'Section I: Humanities & Social Sciences',   'humanities-social-sciences',  1),
  ('gamsat', 'Section II: Written Communication',         'written-communication',       2),
  ('gamsat', 'Section III: Biological & Physical Sciences','biological-physical-sciences',3),
  ('isat',   'Critical Reasoning',     'critical-reasoning',     1),
  ('isat',   'Quantitative Reasoning', 'quantitative-reasoning', 2)
) as v(exam_slug, name, slug, sort_order) on v.exam_slug = e.slug
on conflict (exam_id, slug) do nothing;
