'use client'

import { useState } from 'react'
import { questionViewProgress, recordQuestionView, type QuestionViews } from './question-views'

export function useQuestionViews(questionIds: readonly string[], currentId: string | undefined, visible: boolean) {
  const [previous, setPrevious] = useState<QuestionViews>({ sessionKey: '', viewedIds: [] })
  const current = recordQuestionView(previous, questionIds, currentId, visible)
  // Guarded render-time adjustment keeps the gate in sync with navigation and
  // resets it when a new session or mock section supplies a different question list.
  if (current !== previous) setPrevious(current)
  return questionViewProgress(current, questionIds)
}
