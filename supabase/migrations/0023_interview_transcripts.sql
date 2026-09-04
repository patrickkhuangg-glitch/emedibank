-- 0023 — Private automatic transcripts for interview recordings.

alter table public.interview_attempts
  add column transcript text,
  add column transcription_status text not null default 'not_requested'
    check (transcription_status in ('not_requested', 'processing', 'ready', 'failed')),
  add column transcription_model text;

comment on column public.interview_attempts.transcript is
  'Private transcript generated automatically after an interview recording is saved.';
