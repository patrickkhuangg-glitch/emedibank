// Practice-dashboard stats. Powers the "Practice questions" landing (per-section
// progress + a performance chart) and the "Select category" drill-down.
//
// All server-side via the service-role client: totals and the platform average
// pool across every user's attempts, which RLS would otherwise hide. Nothing here
// leaks another user's identity — only aggregate counts.
import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { canonicalCategories, hidesExtraCategories } from './categories'

export type SectionStat = {
  id: string
  name: string
  slug: string
  total: number // published questions available in the section
  attempted: number // distinct questions this user has answered
  yourPct: number | null // % correct of attempted (null when nothing attempted yet)
  avgPct: number | null // pooled platform accuracy for the section (null when no data)
}

/** Per-section progress + accuracy for one exam, for the section list and chart. */
export async function getSectionStats(examId: string, userId: string): Promise<SectionStat[]> {
  const supabase = createAdminClient()

  const { data: subtests } = await supabase
    .from('subtests')
    .select('id, name, slug, sort_order')
    .eq('exam_id', examId)
    .order('sort_order')
  const subs = subtests ?? []
  if (subs.length === 0) return []
  const subIds = subs.map((s) => s.id)

  // Available questions per section.
  const { data: qs } = await supabase
    .from('questions')
    .select('subtest_id')
    .eq('published', true)
    .in('subtest_id', subIds)
  const totalBySub = new Map<string, number>()
  for (const q of qs ?? []) totalBySub.set(q.subtest_id, (totalBySub.get(q.subtest_id) ?? 0) + 1)

  // This user's attempts — keep the latest verdict per distinct question.
  const { data: mine } = await supabase
    .from('question_attempts')
    .select('subtest_id, question_id, is_correct, answered_at')
    .eq('user_id', userId)
    .eq('exam_id', examId)
    .order('answered_at', { ascending: true })
  const latest = new Map<string, { subtest_id: string; correct: boolean }>()
  for (const a of mine ?? []) latest.set(a.question_id, { subtest_id: a.subtest_id, correct: a.is_correct })
  const attemptedBySub = new Map<string, number>()
  const correctBySub = new Map<string, number>()
  for (const { subtest_id, correct } of latest.values()) {
    attemptedBySub.set(subtest_id, (attemptedBySub.get(subtest_id) ?? 0) + 1)
    if (correct) correctBySub.set(subtest_id, (correctBySub.get(subtest_id) ?? 0) + 1)
  }

  // Pooled platform accuracy per section (all users, all attempts).
  const { data: all } = await supabase
    .from('question_attempts')
    .select('subtest_id, is_correct')
    .eq('exam_id', examId)
  const poolTotal = new Map<string, number>()
  const poolCorrect = new Map<string, number>()
  for (const a of all ?? []) {
    poolTotal.set(a.subtest_id, (poolTotal.get(a.subtest_id) ?? 0) + 1)
    if (a.is_correct) poolCorrect.set(a.subtest_id, (poolCorrect.get(a.subtest_id) ?? 0) + 1)
  }

  return subs.map((s) => {
    const attempted = attemptedBySub.get(s.id) ?? 0
    const correct = correctBySub.get(s.id) ?? 0
    const pt = poolTotal.get(s.id) ?? 0
    const pc = poolCorrect.get(s.id) ?? 0
    return {
      id: s.id,
      name: s.name,
      slug: s.slug,
      total: totalBySub.get(s.id) ?? 0,
      attempted,
      yourPct: attempted ? Math.round((correct / attempted) * 100) : null,
      avgPct: pt ? Math.round((pc / pt) * 100) : null,
    }
  })
}

export type CategoryStat = {
  key: string // the tag; '' for the "All" row
  label: string
  total: number
  attempted: number
}

/** Categories within one section, with counts + this user's progress.
 *  The canonical taxonomy (categories.ts) sets the order and shows every
 *  category even at zero; any extra tags found on questions are appended. */
export async function getCategoryStats(
  userId: string,
  examSlug: string,
  examId: string,
  subtestId: string,
): Promise<{ subtest: { id: string; name: string; slug: string }; categories: CategoryStat[] } | null> {
  const supabase = createAdminClient()

  const { data: subtest } = await supabase
    .from('subtests')
    .select('id, name, slug, exam_id')
    .eq('id', subtestId)
    .maybeSingle()
  if (!subtest || subtest.exam_id !== examId) return null

  const { data: qs } = await supabase
    .from('questions')
    .select('id, tags')
    .eq('published', true)
    .eq('subtest_id', subtestId)
  const questions = qs ?? []

  const { data: mine } = await supabase
    .from('question_attempts')
    .select('question_id')
    .eq('user_id', userId)
    .eq('subtest_id', subtestId)
  const attemptedIds = new Set((mine ?? []).map((a) => a.question_id))

  const totalByTag = new Map<string, number>()
  const attemptedByTag = new Map<string, number>()
  let attemptedAll = 0
  for (const q of questions) {
    const done = attemptedIds.has(q.id)
    if (done) attemptedAll++
    for (const t of q.tags ?? []) {
      totalByTag.set(t, (totalByTag.get(t) ?? 0) + 1)
      if (done) attemptedByTag.set(t, (attemptedByTag.get(t) ?? 0) + 1)
    }
  }

  const row = (name: string): CategoryStat => ({
    key: name,
    label: name,
    total: totalByTag.get(name) ?? 0,
    attempted: attemptedByTag.get(name) ?? 0,
  })

  const canonical = canonicalCategories(examSlug, subtest.slug)
  const matched = new Set(canonical ?? [])
  const extras = [...totalByTag.keys()].filter((t) => !matched.has(t)).sort((a, b) => a.localeCompare(b))
  const ordered = canonical
    ? [...canonical, ...(hidesExtraCategories(examSlug, subtest.slug) ? [] : extras)]
    : extras

  const categories: CategoryStat[] = [
    { key: '', label: `All ${subtest.name}`, total: questions.length, attempted: attemptedAll },
    ...ordered.map(row),
  ]

  return { subtest: { id: subtest.id, name: subtest.name, slug: subtest.slug }, categories }
}
