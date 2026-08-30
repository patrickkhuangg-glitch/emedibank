'use server'

import { getUser } from '@/lib/auth/dal'
import {
  getQuestionForAttempt,
  getQuestionsForAttempt,
  submitAnswer,
  getExplanationPlayback,
} from '@/lib/access/questions'

export async function fetchQuestionAction(questionId: string) {
  const user = await getUser()
  return getQuestionForAttempt(user?.id, questionId)
}

export async function fetchQuestionsAction(ids: string[]) {
  const user = await getUser()
  return getQuestionsForAttempt(user?.id, ids)
}

export async function answerQuestionAction(
  questionId: string,
  optionId: string,
  timeSpentSeconds?: number,
) {
  const user = await getUser()
  if (!user) return { denied: true } as const
  return submitAnswer(user.id, questionId, optionId, timeSpentSeconds)
}

export async function loadExplanationVideoAction(questionId: string) {
  const user = await getUser()
  return getExplanationPlayback(user?.id, questionId)
}

export async function revealAnswerAction(questionId: string) {
  const user = await getUser()
  const { revealSolution } = await import('@/lib/access/questions')
  return revealSolution(user?.id, questionId)
}

export async function submitGridAction(
  questionId: string,
  answers: Record<string, 'Yes' | 'No'>,
  timeSpentSeconds?: number,
) {
  const user = await getUser()
  if (!user) return { denied: true } as const
  const { submitGridAnswer } = await import('@/lib/access/questions')
  return submitGridAnswer(user.id, questionId, answers, timeSpentSeconds)
}

export async function submitMostLeastAction(
  questionId: string,
  choice: { most: number; least: number },
  timeSpentSeconds?: number,
) {
  const user = await getUser()
  if (!user) return { denied: true } as const
  const { submitMostLeastAnswer } = await import('@/lib/access/questions')
  return submitMostLeastAnswer(user.id, questionId, choice, timeSpentSeconds)
}
