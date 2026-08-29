'use server'

import { getUser } from '@/lib/auth/dal'
import {
  getQuestionForAttempt,
  submitAnswer,
  getExplanationPlayback,
} from '@/lib/access/questions'

export async function fetchQuestionAction(questionId: string) {
  const user = await getUser()
  return getQuestionForAttempt(user?.id, questionId)
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
