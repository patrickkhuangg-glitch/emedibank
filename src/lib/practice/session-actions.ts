'use server'
import { requireUser } from '@/lib/auth/dal'
import { createClient } from '@/lib/supabase/server'

/** Record a finished practice session (best-effort: never throws to the runner).
 *  Silently no-ops if migration 0009 hasn't been applied yet. */
export async function recordPracticeSessionAction(input: {
  examSlug: string
  subtestId: string | null
  tag: string | null
  mode: string
  total: number
  correct: number
  timeSpentSeconds: number | null
}): Promise<void> {
  try {
    if (input.total <= 0) return // nothing answered — don't log an empty session
    const user = await requireUser()
    const supabase = await createClient()
    const { data: exam } = await supabase.from('exams').select('id').eq('slug', input.examSlug).maybeSingle()
    if (!exam) return
    await supabase.from('practice_sessions').insert({
      user_id: user.id,
      exam_id: exam.id,
      subtest_id: input.subtestId || null,
      tag: input.tag || null,
      mode: input.mode || 'sets',
      total: input.total,
      correct: input.correct,
      time_spent_seconds: input.timeSpentSeconds,
    })
  } catch {
    // best-effort: a failed roll-up must never break the user's session
  }
}
