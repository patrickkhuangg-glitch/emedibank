import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildSafeQuestion, loadMeta, type SafeQuestion } from '@/lib/access/questions'
import type { StoredSessionResponse } from '@/lib/practice/session-actions'

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
  reviewAvailable: boolean
}

/** A user's finished practice sessions for an exam, newest first.
 *  Returns [] if the table isn't present yet (migration 0009 not run). */
export async function getPracticeSessions(userId: string, examId: string): Promise<PracticeSession[]> {
  const supabase = await createClient()
  const current = await supabase
    .from('practice_sessions')
    .select('id, tag, mode, total, correct, time_spent_seconds, question_ids, created_at, subtests(name, slug)')
    .eq('user_id', userId)
    .eq('exam_id', examId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (current.error) {
    // Keep existing summary history visible until migration 0016 is applied.
    const legacy = await supabase
      .from('practice_sessions')
      .select('id, tag, mode, total, correct, time_spent_seconds, created_at, subtests(name, slug)')
      .eq('user_id', userId)
      .eq('exam_id', examId)
      .order('created_at', { ascending: false })
      .limit(50)
    if (legacy.error || !legacy.data) return []
    return legacy.data.map((r) => {
      const sub = r.subtests as { name: string; slug: string } | null
      return { id: r.id, subtestName: sub?.name ?? null, subtestSlug: sub?.slug ?? null, tag: r.tag, mode: r.mode, total: r.total, correct: r.correct, timeSpentSeconds: r.time_spent_seconds, createdAt: r.created_at, reviewAvailable: false }
    })
  }
  if (!current.data) return []
  return current.data.map((r) => {
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
      reviewAvailable: (r.question_ids ?? []).length > 0,
    }
  })
}

export type HistoricalReviewItem = {
  question: SafeQuestion
  selectedOptionId: string | null
  response: Record<string, unknown> | null
  score: number
  answered: boolean
  correctOptionId: string | null
  correctStatements: { index: number; answer: 'Yes' | 'No' }[] | null
  correctMostLeast: { most: number; least: number } | null
  explanation: string | null
}

export type HistoricalPracticeReview = {
  id: string
  examName: string
  examSlug: string
  subtestName: string | null
  tag: string | null
  mode: string
  total: number
  correct: number
  timeSpentSeconds: number | null
  createdAt: string
  items: HistoricalReviewItem[]
}

/** Load one immutable completed session for its owner, including answer keys.
 * Ownership is verified before any secure question data is assembled. */
export async function getPracticeSessionReview(userId: string, sessionId: string): Promise<HistoricalPracticeReview | null> {
  const db = createAdminClient()
  const { data: session } = await db.from('practice_sessions')
    .select('id,user_id,exam_id,subtest_id,tag,mode,total,correct,time_spent_seconds,created_at,question_ids,responses')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .maybeSingle()
  if (!session || !session.question_ids?.length) return null

  const [{ data: exam }, { data: subtest }] = await Promise.all([
    db.from('exams').select('name,slug').eq('id', session.exam_id).maybeSingle(),
    session.subtest_id ? db.from('subtests').select('name').eq('id', session.subtest_id).maybeSingle() : Promise.resolve({ data: null }),
  ])
  if (!exam) return null
  const stored = Array.isArray(session.responses) ? session.responses as StoredSessionResponse[] : []
  const responseById = new Map(stored.map((item) => [item.questionId, item]))

  const items = (await Promise.all(session.question_ids.map(async (questionId): Promise<HistoricalReviewItem | null> => {
    const meta = await loadMeta(questionId)
    if (!meta || meta.exam_id !== session.exam_id) return null
    const question = await buildSafeQuestion(meta)
    const saved = responseById.get(questionId)
    let correctOptionId: string | null = null
    let correctStatements: HistoricalReviewItem['correctStatements'] = null
    let correctMostLeast: HistoricalReviewItem['correctMostLeast'] = null
    if (meta.data?.statements?.length) {
      correctStatements = meta.data.statements.map((statement, index) => ({ index, answer: statement.correct }))
    } else if (meta.data?.mostLeast) {
      correctMostLeast = { most: meta.data.mostLeast.correctMost, least: meta.data.mostLeast.correctLeast }
    } else {
      const { data: options } = await db.from('question_options').select('id,is_correct').eq('question_id', questionId)
      correctOptionId = options?.find((option) => option.is_correct)?.id ?? null
    }
    return {
      question,
      selectedOptionId: saved?.selectedOptionId ?? null,
      response: saved?.response ?? null,
      score: saved?.score ?? 0,
      answered: saved?.answered ?? false,
      correctOptionId,
      correctStatements,
      correctMostLeast,
      explanation: meta.explanation_text,
    }
  }))).filter((item): item is HistoricalReviewItem => item !== null)

  return {
    id: session.id,
    examName: exam.name,
    examSlug: exam.slug,
    subtestName: subtest?.name ?? null,
    tag: session.tag,
    mode: session.mode,
    total: session.total,
    correct: session.correct,
    timeSpentSeconds: session.time_spent_seconds,
    createdAt: session.created_at,
    items,
  }
}
