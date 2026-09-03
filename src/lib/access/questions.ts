// Question-bank access + grading. All server-side (service role): the answer key
// and explanation never reach the browser until the student submits, and the
// video explanation is paid-only. Reuses Phase 1's exam entitlements.
import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { canAccessExam, hasActiveEntitlement } from '@/lib/access'
import type { QuestionKind } from '@/lib/supabase/types'
import { questionMarkValue } from '@/lib/practice/marks'

type YesNo = 'Yes' | 'No'
type Table = { headers: string[]; rows: string[][] }
export type QData = {
  passage?: string
  image?: string
  images?: string[]
  table?: Table
  tables?: Table[]
  statements?: { text: string; correct: YesNo }[]
  mostLeast?: { actions: { text: string }[]; correctMost: number; correctLeast: number }
}

export type QuestionMeta = {
  id: string
  subtest_id: string
  subtest_slug: string
  stimulus_id: string | null
  exam_id: string
  published: boolean
  kind: QuestionKind
  topic: string | null
  tags: string[]
  stem: string
  data: QData | null
  explanation_text: string | null
  video_status: string
}

export async function loadMeta(questionId: string): Promise<QuestionMeta | null> {
  const supabase = createAdminClient()
  const { data: q } = await supabase.from('questions').select('*').eq('id', questionId).maybeSingle()
  if (!q) return null
  const { data: st } = await supabase
    .from('subtests')
    .select('exam_id, slug')
    .eq('id', q.subtest_id)
    .maybeSingle()
  if (!st) return null
  return { ...q, stimulus_id: q.stimulus_id ?? null, data: (q.data as QData | null) ?? null, exam_id: st.exam_id, subtest_slug: st.slug }
}

// SJT (Importance / Appropriateness) awards half a mark for an answer one step off
// on the SAME side of the 4-point scale — A<->B or C<->D — but nothing for crossing
// the midpoint (B<->C) or any larger gap. Every other question is all-or-nothing.
// Assumes options are labelled A..D top-to-bottom of the scale (the import order).
export function markScore(
  m: Pick<QuestionMeta, 'subtest_slug' | 'tags'>,
  correctLabel: string | undefined,
  selectedLabel: string | undefined,
  isCorrect: boolean,
): number {
  if (isCorrect) return questionMarkValue(m.subtest_slug, m.tags)
  if (m.subtest_slug !== 'situational-judgement' || !correctLabel || !selectedLabel) return 0
  const pair = new Set([correctLabel.toUpperCase(), selectedLabel.toUpperCase()])
  if ((pair.has('A') && pair.has('B')) || (pair.has('C') && pair.has('D'))) return 0.5
  return 0
}

export async function canAttemptQuestion(userId: string | null | undefined, questionId: string) {
  const m = await loadMeta(questionId)
  if (!m || !m.published) return false
  return canAccessExam(userId, m.exam_id)
}

export async function canWatchExplanation(userId: string | null | undefined, questionId: string) {
  const m = await loadMeta(questionId)
  if (!m) return false
  return hasActiveEntitlement(userId, m.exam_id)
}

export type SafeQuestion = {
  id: string
  kind: QuestionKind
  topic: string | null
  marks: number
  stem: string
  passage: string | null
  image: string | null
  images: string[]
  table: { headers: string[]; rows: string[][] } | null
  tables: { headers: string[]; rows: string[][] }[]
  // present => 5-statement Yes/No grid (Decision Making syllogisms / interpreting info)
  statements: { index: number; text: string }[] | null
  // present => SJT most/least appropriate drag-and-drop
  mostLeast: { actions: { index: number; text: string }[] } | null
  options: { id: string; label: string; body: string }[]
}

/** Build the sanitized question payload — no correct flags, no explanation, no
 *  video. Pure of any access gate; callers must decide who may see it. */
export async function buildSafeQuestion(m: QuestionMeta): Promise<SafeQuestion> {
  let sd: QData | null = null
  if (m.stimulus_id) {
    const sup = createAdminClient()
    const { data: stim } = await sup.from('stimuli').select('data').eq('id', m.stimulus_id).maybeSingle()
    sd = (stim?.data as QData | null) ?? null
  }
  // A stimulus/question may carry several data tables (common in Section III
  // science units); keep `table` as the first for older single-table callers.
  const tbls: Table[] = sd?.tables ?? m.data?.tables ?? (sd?.table ? [sd.table] : m.data?.table ? [m.data.table] : [])
  const imgs: string[] = sd?.images ?? m.data?.images ?? (sd?.image ? [sd.image] : m.data?.image ? [m.data.image] : [])
  const base = {
    id: m.id,
    kind: m.kind,
    topic: m.topic,
    marks: questionMarkValue(m.subtest_slug, m.tags),
    stem: m.stem,
    passage: sd?.passage ?? m.data?.passage ?? null,
    image: imgs[0] ?? null,
    images: imgs,
    table: tbls[0] ?? null,
    tables: tbls,
  }

  if (m.data?.statements?.length) {
    return { ...base, statements: m.data.statements.map((s, index) => ({ index, text: s.text })), mostLeast: null, options: [] }
  }
  if (m.data?.mostLeast?.actions?.length) {
    return { ...base, statements: null, mostLeast: { actions: m.data.mostLeast.actions.map((a, index) => ({ index, text: a.text })) }, options: [] }
  }

  const supabase = createAdminClient()
  const { data: opts } = await supabase
    .from('question_options')
    .select('id, label, body, sort_order')
    .eq('question_id', m.id)
    .order('sort_order')
  return { ...base, statements: null, mostLeast: null, options: (opts ?? []).map((o) => ({ id: o.id, label: o.label, body: o.body })) }
}

/** Sanitized question for the practice runner — gated by exam access. */
export async function getQuestionForAttempt(
  userId: string | null | undefined,
  questionId: string,
): Promise<{ locked: true } | { locked: false; question: SafeQuestion }> {
  const m = await loadMeta(questionId)
  if (!m || !m.published) return { locked: true }
  if (!(await canAccessExam(userId, m.exam_id))) return { locked: true }
  return { locked: false, question: await buildSafeQuestion(m) }
}

/** Bulk sanitized fetch — one round-trip for a whole session so navigation is
 *  instant. Each question is still entitlement-gated; locked ones map to null. */
export async function getQuestionsForAttempt(
  userId: string | null | undefined,
  ids: string[],
): Promise<Record<string, SafeQuestion | null>> {
  const entries = await Promise.all(
    ids.map(async (id) => {
      const r = await getQuestionForAttempt(userId, id)
      return [id, r.locked ? null : r.question] as const
    }),
  )
  return Object.fromEntries(entries)
}

export type AnswerResult = {
  is_correct: boolean
  score: number
  correct_option_id: string | null
  explanation_text: string | null
  can_watch_video: boolean
  has_video: boolean
  video_ready: boolean
}

/** Grade a single-best-answer submission, record the attempt, reveal the outcome.
 *  Pure of any access gate — callers gate before calling. */
export async function gradeSingle(
  userId: string,
  m: QuestionMeta,
  selectedOptionId: string,
  timeSpentSeconds?: number,
): Promise<AnswerResult> {
  const supabase = createAdminClient()
  const { data: opts } = await supabase
    .from('question_options')
    .select('id, is_correct, label')
    .eq('question_id', m.id)
  const correct = (opts ?? []).find((o) => o.is_correct)
  const selected = (opts ?? []).find((o) => o.id === selectedOptionId)
  const is_correct = !!correct && correct.id === selectedOptionId
  const score = markScore(m, correct?.label, selected?.label, is_correct)

  await supabase.from('question_attempts').insert({
    user_id: userId,
    question_id: m.id,
    subtest_id: m.subtest_id,
    exam_id: m.exam_id,
    selected_option_id: selectedOptionId,
    is_correct,
    time_spent_seconds: timeSpentSeconds ?? null,
  })

  return {
    is_correct,
    score,
    correct_option_id: correct?.id ?? null,
    explanation_text: m.explanation_text,
    can_watch_video: await hasActiveEntitlement(userId, m.exam_id),
    has_video: m.video_status !== 'none',
    video_ready: m.video_status === 'ready',
  }
}

/** Gated single-best-answer submission for the practice runner. */
export async function submitAnswer(
  userId: string,
  questionId: string,
  selectedOptionId: string,
  timeSpentSeconds?: number,
): Promise<AnswerResult | { denied: true }> {
  const m = await loadMeta(questionId)
  if (!m || !m.published) return { denied: true }
  if (!(await canAccessExam(userId, m.exam_id))) return { denied: true }
  return gradeSingle(userId, m, selectedOptionId, timeSpentSeconds)
}

export type GridResult = {
  is_correct: boolean
  score: number
  per_statement: { index: number; correct: boolean; correct_answer: YesNo }[]
  explanation_text: string | null
  can_watch_video: boolean
  has_video: boolean
  video_ready: boolean
}

/** Grade a Yes/No grid submission (all statements must match to count correct).
 *  Pure of any access gate — callers gate before calling. */
export async function gradeGrid(
  userId: string,
  m: QuestionMeta,
  answers: Record<string, YesNo>,
  timeSpentSeconds?: number,
): Promise<GridResult> {
  const per_statement = (m.data?.statements ?? []).map((s, index) => ({
    index,
    correct_answer: s.correct,
    correct: answers[String(index)] === s.correct,
  }))
  const is_correct = per_statement.every((p) => p.correct)

  const supabase = createAdminClient()
  await supabase.from('question_attempts').insert({
    user_id: userId,
    question_id: m.id,
    subtest_id: m.subtest_id,
    exam_id: m.exam_id,
    selected_option_id: null,
    response: answers,
    is_correct,
    time_spent_seconds: timeSpentSeconds ?? null,
  })

  return {
    is_correct,
    score: is_correct ? questionMarkValue(m.subtest_slug, m.tags) : 0,
    per_statement,
    explanation_text: m.explanation_text,
    can_watch_video: await hasActiveEntitlement(userId, m.exam_id),
    has_video: m.video_status !== 'none',
    video_ready: m.video_status === 'ready',
  }
}

/** Gated Yes/No grid submission for the practice runner. */
export async function submitGridAnswer(
  userId: string,
  questionId: string,
  answers: Record<string, YesNo>,
  timeSpentSeconds?: number,
): Promise<GridResult | { denied: true }> {
  const m = await loadMeta(questionId)
  if (!m || !m.published || !m.data?.statements?.length) return { denied: true }
  if (!(await canAccessExam(userId, m.exam_id))) return { denied: true }
  return gradeGrid(userId, m, answers, timeSpentSeconds)
}

/**
 * Mint a signed Mux playback token for a question's explanation — paid users only,
 * only when the video is ready. Returns null-ish for everyone else.
 */
export async function getExplanationPlayback(
  userId: string | null | undefined,
  questionId: string,
): Promise<{ playbackId: string; token: string } | { denied: true }> {
  const supabase = createAdminClient()
  const { data: q } = await supabase
    .from('questions')
    .select('mux_playback_id, video_status, subtest_id')
    .eq('id', questionId)
    .maybeSingle()
  if (!q || q.video_status !== 'ready' || !q.mux_playback_id) return { denied: true }

  const { data: st } = await supabase
    .from('subtests')
    .select('exam_id')
    .eq('id', q.subtest_id)
    .maybeSingle()
  if (!st || !(await hasActiveEntitlement(userId, st.exam_id))) return { denied: true }

  const { createPlaybackToken } = await import('@/lib/mux/playback')
  return { playbackId: q.mux_playback_id, token: await createPlaybackToken(q.mux_playback_id) }
}


export type MostLeastResult = {
  is_correct: boolean
  score: number
  correct_most: number
  correct_least: number
  most_correct: boolean
  least_correct: boolean
  explanation_text: string | null
  can_watch_video: boolean
  has_video: boolean
  video_ready: boolean
}

/** Grade an SJT most/least submission — both must match to count correct.
 *  Pure of any access gate — callers gate before calling. */
export async function gradeMostLeast(
  userId: string,
  m: QuestionMeta,
  choice: { most: number; least: number },
  timeSpentSeconds?: number,
): Promise<MostLeastResult> {
  const { correctMost, correctLeast } = m.data!.mostLeast!
  const most_correct = choice.most === correctMost
  const least_correct = choice.least === correctLeast
  const is_correct = most_correct && least_correct

  const supabase = createAdminClient()
  await supabase.from('question_attempts').insert({
    user_id: userId,
    question_id: m.id,
    subtest_id: m.subtest_id,
    exam_id: m.exam_id,
    selected_option_id: null,
    response: choice,
    is_correct,
    time_spent_seconds: timeSpentSeconds ?? null,
  })

  return {
    is_correct,
    score: is_correct ? 1 : 0,
    correct_most: correctMost,
    correct_least: correctLeast,
    most_correct,
    least_correct,
    explanation_text: m.explanation_text,
    can_watch_video: await hasActiveEntitlement(userId, m.exam_id),
    has_video: m.video_status !== 'none',
    video_ready: m.video_status === 'ready',
  }
}

/** Gated SJT most/least submission for the practice runner. */
export async function submitMostLeastAnswer(
  userId: string,
  questionId: string,
  choice: { most: number; least: number },
  timeSpentSeconds?: number,
): Promise<MostLeastResult | { denied: true }> {
  const m = await loadMeta(questionId)
  if (!m || !m.published || !m.data?.mostLeast) return { denied: true }
  if (!(await canAccessExam(userId, m.exam_id))) return { denied: true }
  return gradeMostLeast(userId, m, choice, timeSpentSeconds)
}

export type RevealResult =
  | { kind: 'mcq'; result: AnswerResult }
  | { kind: 'grid'; result: GridResult }
  | { kind: 'most_least'; result: MostLeastResult }

/** The solution to a question WITHOUT recording an attempt — for reviewing items
 *  the student left unanswered. Gated by exam access. */
export async function revealSolution(
  userId: string | null | undefined,
  questionId: string,
): Promise<RevealResult | { denied: true }> {
  const m = await loadMeta(questionId)
  if (!m || !m.published) return { denied: true }
  if (!(await canAccessExam(userId, m.exam_id))) return { denied: true }
  const common = {
    explanation_text: m.explanation_text,
    can_watch_video: await hasActiveEntitlement(userId, m.exam_id),
    has_video: m.video_status !== 'none',
    video_ready: m.video_status === 'ready',
  }

  if (m.data?.statements?.length) {
    return {
      kind: 'grid',
      result: { is_correct: false, score: 0, per_statement: m.data.statements.map((s, index) => ({ index, correct: false, correct_answer: s.correct })), ...common },
    }
  }
  if (m.data?.mostLeast) {
    return {
      kind: 'most_least',
      result: { is_correct: false, score: 0, correct_most: m.data.mostLeast.correctMost, correct_least: m.data.mostLeast.correctLeast, most_correct: false, least_correct: false, ...common },
    }
  }
  const supabase = createAdminClient()
  const { data: opts } = await supabase.from('question_options').select('id, is_correct').eq('question_id', m.id)
  const correct = (opts ?? []).find((o) => o.is_correct)
  return { kind: 'mcq', result: { is_correct: false, score: 0, correct_option_id: correct?.id ?? null, ...common } }
}
