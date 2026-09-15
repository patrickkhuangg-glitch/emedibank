import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type { MockDef } from './config'
import { QR_TOP_SCORE_BY_FORM } from './config'
import { groupedQuestionsFirst } from './review'

export type ResolvedSection = {
  subtestSlug: string
  name: string
  minutes: number
  questionIds: string[]
  qrTopScoreRaw?: 35 | 36
}

/** Resolve a fixed, explicitly assigned form. Mock content is never sampled at
 * runtime: every student receives the same questions in the same order. */
export async function resolveMockSections(examId: string, mock: MockDef): Promise<ResolvedSection[]> {
  const supabase = createAdminClient()
  const { data: subs } = await supabase.from('subtests').select('id, slug').eq('exam_id', examId)
  const bySlug = new Map((subs ?? []).map((s) => [s.slug, s.id]))

  const { data: assigned, error } = await supabase
    .from('mock_question_assignments')
    .select('subtest_id, question_id, sort_order')
    .eq('exam_id', examId)
    .eq('mock_key', mock.assignmentKey)
    .order('sort_order', { ascending: true })
  if (error || !assigned?.length) return []

  const questionIds = assigned.map((row) => row.question_id)
  const { data: published } = await supabase
    .from('questions')
    .select('id, subtest_id, stimulus_id')
    .in('id', questionIds)
    .eq('published', true)
  const valid = new Map((published ?? []).map((question) => [question.id, question.subtest_id]))

  const out: ResolvedSection[] = []
  for (const sec of mock.sections) {
    const subtestId = bySlug.get(sec.subtestSlug)
    if (!subtestId) continue
    let picked = assigned
      .filter((row) => row.subtest_id === subtestId && valid.get(row.question_id) === subtestId)
      .slice(0, Math.max(0, sec.count))
      .map((row) => row.question_id)
    if (sec.subtestSlug === 'quantitative-reasoning') {
      const byId = new Map((published ?? []).map(q => [q.id, q]))
      picked = groupedQuestionsFirst(picked.map(id => byId.get(id)!)).map(q => q.id)
    }
    if (picked.length) out.push({ subtestSlug: sec.subtestSlug, name: sec.name, minutes: sec.minutes, questionIds: picked,
      ...(sec.subtestSlug === 'quantitative-reasoning' ? { qrTopScoreRaw: QR_TOP_SCORE_BY_FORM[mock.assignmentKey] ?? 36 } : {}),
    })
  }
  return out
}

/** Best-effort counts keep catalogue pages useful before migration/content load. */
export async function mockAssignmentCounts(examId: string, mockKeys: string[]): Promise<Record<string, number>> {
  if (!mockKeys.length) return {}
  const { data, error } = await createAdminClient()
    .from('mock_question_assignments')
    .select('mock_key')
    .eq('exam_id', examId)
    .in('mock_key', mockKeys)
  if (error) return {}
  return (data ?? []).reduce<Record<string, number>>((counts, row) => {
    counts[row.mock_key] = (counts[row.mock_key] ?? 0) + 1
    return counts
  }, {})
}
