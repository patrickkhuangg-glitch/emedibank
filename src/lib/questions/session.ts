import 'server-only'
import { randomInt } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { canAccessExam } from '@/lib/access'

export type SessionFilters = {
  subtestIds: string[]
  tags: string[]
  difficulty: string | null
  count: number
}

/** Resolve a randomized set of published question ids for a session (entitled only). */
export async function resolveSessionQuestionIds(
  userId: string,
  examId: string,
  f: SessionFilters,
): Promise<string[]> {
  if (!(await canAccessExam(userId, examId))) return []
  const supabase = createAdminClient()

  let subtestIds = f.subtestIds
  if (subtestIds.length === 0) {
    const { data: subs } = await supabase.from('subtests').select('id').eq('exam_id', examId)
    subtestIds = (subs ?? []).map((s) => s.id)
  }

  let query = supabase.from('questions').select('id').eq('published', true).in('subtest_id', subtestIds)
  if (f.difficulty) query = query.eq('difficulty', f.difficulty as 'easy' | 'medium' | 'hard')
  if (f.tags.length) query = query.overlaps('tags', f.tags)

  const { data } = await query
  const ids = (data ?? []).map((q) => q.id)
  for (let i = ids.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
  }
  return ids.slice(0, Math.max(1, f.count))
}
