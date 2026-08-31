import 'server-only'
import { createClient } from '@/lib/supabase/server'

export type PracticeSession = {
  id: string
  subtestName: string | null
  subtestSlug: string | null
  tag: string | null
  mode: string
  total: number
  correct: number
  timeSpentSeconds: number | null
  createdAt: string
}

/** A user's finished practice sessions for an exam, newest first.
 *  Returns [] if the table isn't present yet (migration 0009 not run). */
export async function getPracticeSessions(userId: string, examId: string): Promise<PracticeSession[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('practice_sessions')
    .select('id, tag, mode, total, correct, time_spent_seconds, created_at, subtests(name, slug)')
    .eq('user_id', userId)
    .eq('exam_id', examId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error || !data) return []
  return data.map((r) => {
    const sub = r.subtests as { name: string; slug: string } | null
    return {
      id: r.id,
      subtestName: sub?.name ?? null,
      subtestSlug: sub?.slug ?? null,
      tag: r.tag,
      mode: r.mode,
      total: r.total,
      correct: r.correct,
      timeSpentSeconds: r.time_spent_seconds,
      createdAt: r.created_at,
    }
  })
}
