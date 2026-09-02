-- 0013_essay_marking.sql — essay credits + the tutor-marking pipeline.
--
-- Students spend credits to submit an essay for marking. An AI first-draft is
-- generated for the admin, who edits and APPROVES it before the student ever
-- sees it. The unapproved AI/working draft lives in essay_markings (admin-only
-- RLS) so it can never leak to the student; only the approved `tutor_feedback`
-- and the `marking_status` are exposed on essay_responses (which the student can
-- read for their own rows).

-- Per-account essay-marking credit balance. Existing rows backfill to 40.
alter table public.profiles add column if not exists essay_credits integer not null default 40;

-- Student-visible marking fields on the response.
alter table public.essay_responses
  add column if not exists marking_status text,               -- null | 'pending' | 'approved'
  add column if not exists tutor_feedback text,               -- approved, student-visible feedback
  add column if not exists credits_spent integer not null default 0,
  add column if not exists submitted_for_marking_at timestamptz,
  add column if not exists marked_at timestamptz;

-- Admin-only working area: the raw AI draft and the tutor's in-progress edit,
-- kept out of the student's reach until approval copies it to tutor_feedback.
create table if not exists public.essay_markings (
  id             uuid primary key default gen_random_uuid(),
  response_id    uuid not null unique references public.essay_responses (id) on delete cascade,
  ai_feedback    text,                                        -- raw AI first draft
  draft_feedback text,                                        -- tutor's working edit
  status         text not null default 'pending',            -- 'pending' | 'approved'
  marked_by      uuid references auth.users (id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.essay_markings enable row level security;
create policy "Admins manage essay markings"
  on public.essay_markings for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Atomic credit spend for the CALLING user (auth.uid()). Returns true only if
-- the user had enough credits, so a marking request can never overdraw or race.
create or replace function public.spend_essay_credits(p_amount integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare affected integer;
begin
  update public.profiles
     set essay_credits = essay_credits - p_amount
   where id = auth.uid() and essay_credits >= p_amount;
  get diagnostics affected = row_count;
  return affected > 0;
end $$;

grant execute on function public.spend_essay_credits(integer) to authenticated;

comment on table public.essay_markings is
  'Admin-only working area for essay marking: AI draft + tutor edit, before approval.';
