-- Partial-credit SJT scoring.
--
-- SJT Importance/Appropriateness now awards half a mark for an answer one step off
-- on the same side of the 4-point scale (A<->B or C<->D). A practice session's
-- score can therefore be fractional, so the History roll-up column must hold
-- non-integers. Per-question attempts stay boolean (question_attempts.is_correct),
-- so dashboard XP/accuracy is unchanged; the half-mark lives in the session score
-- and the runner's results screen.

alter table public.practice_sessions alter column correct type real;
