'use server'
// Server actions for a live mock run. Every call re-verifies the signed manifest
// against the current user and the requested question, so access is bound to a
// legitimately-issued mock — not to exam entitlement (mocks are free) and not
// open to enumerating the paid bank.
import { getUser } from '@/lib/auth/dal'
import { verifyManifest } from './token'
import {
  loadMeta,
  buildSafeQuestion,
  gradeSingle,
  gradeGrid,
  gradeMostLeast,
  type SafeQuestion,
  type AnswerResult,
  type GridResult,
  type MostLeastResult,
  type QuestionMeta,
} from '@/lib/access/questions'

type YesNo = 'Yes' | 'No'

/** Auth + manifest + membership + published-in-this-exam. Null on any failure. */
async function verify(token: string, questionId: string): Promise<{ userId: string; meta: QuestionMeta } | null> {
  const user = await getUser()
  if (!user) return null
  const m = verifyManifest(token, user.id)
  if (!m || !m.q.includes(questionId)) return null
  const meta = await loadMeta(questionId)
  if (!meta || !meta.published || meta.exam_id !== m.e) return null
  return { userId: user.id, meta }
}

export async function mockFetchQuestionAction(
  token: string,
  questionId: string,
): Promise<{ locked: true } | { locked: false; question: SafeQuestion }> {
  const v = await verify(token, questionId)
  if (!v) return { locked: true }
  return { locked: false, question: await buildSafeQuestion(v.meta) }
}

export async function mockGradeSingleAction(
  token: string,
  questionId: string,
  selectedOptionId: string,
  timeSpentSeconds?: number,
): Promise<AnswerResult | { denied: true }> {
  const v = await verify(token, questionId)
  if (!v) return { denied: true }
  return gradeSingle(v.userId, v.meta, selectedOptionId, timeSpentSeconds)
}

export async function mockGradeGridAction(
  token: string,
  questionId: string,
  answers: Record<string, YesNo>,
  timeSpentSeconds?: number,
): Promise<GridResult | { denied: true }> {
  const v = await verify(token, questionId)
  if (!v || !v.meta.data?.statements?.length) return { denied: true }
  return gradeGrid(v.userId, v.meta, answers, timeSpentSeconds)
}

export async function mockGradeMostLeastAction(
  token: string,
  questionId: string,
  choice: { most: number; least: number },
  timeSpentSeconds?: number,
): Promise<MostLeastResult | { denied: true }> {
  const v = await verify(token, questionId)
  if (!v || !v.meta.data?.mostLeast) return { denied: true }
  return gradeMostLeast(v.userId, v.meta, choice, timeSpentSeconds)
}
