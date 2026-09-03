-- Restore only the fields a student may edit while drafting. RLS still limits
-- updates to rows owned by auth.uid(). Submission and marking state remain
-- server-controlled and are deliberately excluded from this grant.

grant update (body, plan, word_count, time_spent_seconds, updated_at)
  on table public.essay_responses
  to authenticated;

