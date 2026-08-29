// Question-bank access + grading. All server-side (service role): the answer key
// and explanation never reach the browser until the student submits, and the
// video explanation is paid-only. Reuses Phase 1's exam entitlements.
import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { canAccessExam, hasActiveEntitlement } from '@/lib/access'
import type { QuestionKind } from '@/lib/supabase/types'

type QuestionMeta = {
  id: string
  subtest_id: string
  exam_id: string
  published: boolean
  kind: QuestionKind
  topic: string | null
  stem: string
  explanation_text: string | null
  video_status: string
}

async function loadMeta(questionId: string): Promise<QuestionMeta | null> {
  const supabase = createAdminClient()
  const { data: q } = await supabase
    .from('questions')
    .select('id, subtest_id, published, kind, topic, stem, explanation_text, video_status')
    .eq('id', questionId)
    .maybeSingle()
  if (!q) return null
  const { data: st } = await supabase
    .from('subtests')
    .select('exam_id')
    .eq('id', q.subtest_id)
    .maybeSingle()
  if (!st) return null
  return { ...q, exam_id: st.exam_id }
}

/** Can this user attempt the question? (Paid; free access arrives via mocks in P3.) */
export async function canAttemptQuestion(userId: string | null | undefined, questionId: string) {
  const m = await loadMeta(questionId)
  if (!m || !m.published) return false
  return canAccessExam(userId, m.exam_id)
}

/** Can this user watch the video explanation? Paid — gated for all. */
export async function canWatchExplanation(userId: string | null | undefined, questionId: string) {
  const m = await loadMeta(questionId)
  if (!m) return false
  return hasActiveEntitlement(userId, m.exam_id)
}

export type SafeQuestion = {
  id: string
  kind: QuestionKind
  topic: string | null
  stem: string
  options: { id: string; label: string; body: string }[]
}

/** Sanitized question for the runner — no correct flags, no explanation, no video. */
export async function getQuestionForAttempt(
  userId: string | null | undefined,
  questionId: string,
): Promise<{ locked: true } | { locked: false; question: SafeQuestion }> {
  const m = await loadMeta(questionId)
  if (!m || !m.published) return { locked: true }
  if (!(await canAccessExam(userId, m.exam_id))) return { locked: true }

  const supabase = createAdminClient()
  const { data: opts } = await supabase
    .from('question_options')
    .select('id, label, body, sort_order')
    .eq('question_id', questionId)
    .order('sort_order')

  return {
    locked: false,
    question: {
      id: m.id,
      kind: m.kind,
      topic: m.topic,
      stem: m.stem,
      options: (opts ?? []).map((o) => ({ id: o.id, label: o.label, body: o.body })),
    },
  }
}

export type AnswerResult = {
  is_correct: boolean
  correct_option_id: string | null
  explanation_text: string | null
  can_watch_video: boolean
  has_video: boolean
  video_ready: boolean
}

/** Grade a submission server-side, record the attempt, and reveal the outcome. */
export async function submitAnswer(
  userId: string,
  questionId: string,
  selectedOptionId: string,
  timeSpentSeconds?: number,
): Promise<AnswerResult | { denied: true }> {
  const m = await loadMeta(questionId)
  if (!m || !m.published) return { denied: true }
  if (!(await canAccessExam(userId, m.exam_id))) return { denied: true }

  const supabase = createAdminClient()
  const { data: opts } = await supabase
    .from('question_options')
    .select('id, is_correct')
    .eq('question_id', questionId)
  const correct = (opts ?? []).find((o) => o.is_correct)
  const is_correct = !!correct && correct.id === selectedOptionId

  await supabase.from('question_attempts').insert({
    user_id: userId,
    question_id: questionId,
    subtest_id: m.subtest_id,
    exam_id: m.exam_id,
    selected_option_id: selectedOptionId,
    is_correct,
    time_spent_seconds: timeSpentSeconds ?? null,
  })

  return {
    is_correct,
    correct_option_id: correct?.id ?? null,
    explanation_text: m.explanation_text,
    can_watch_video: await hasActiveEntitlement(userId, m.exam_id),
    has_video: m.video_status !== 'none',
    video_ready: m.video_status === 'ready',
  }
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
