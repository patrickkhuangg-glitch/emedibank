-- Record the independent provider outputs used by the tutor marking workflow.
alter table public.essay_markings
  add column if not exists primary_provider text,
  add column if not exists primary_model text,
  add column if not exists secondary_feedback text,
  add column if not exists secondary_provider text,
  add column if not exists secondary_model text,
  add column if not exists rubric_version text;

comment on column public.essay_markings.ai_feedback is
  'Primary AI marker output. Currently GPT-5.6 Terra.';
comment on column public.essay_markings.secondary_feedback is
  'Independent secondary marker output. Currently Claude Sonnet.';
