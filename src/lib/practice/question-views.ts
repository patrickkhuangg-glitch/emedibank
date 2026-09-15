export type QuestionViews = { sessionKey: string; viewedIds: readonly string[] }

/** Only the current, loaded question counts as viewed; prefetching does not. */
export function recordQuestionView(
  previous: QuestionViews,
  questionIds: readonly string[],
  currentId: string | undefined,
  visible: boolean,
): QuestionViews {
  const sessionKey = JSON.stringify(questionIds)
  const state = previous.sessionKey === sessionKey ? previous : { sessionKey, viewedIds: [] }
  if (!visible || !currentId || !questionIds.includes(currentId) || state.viewedIds.includes(currentId)) return state
  return { sessionKey, viewedIds: [...state.viewedIds, currentId] }
}

export function questionViewProgress(state: QuestionViews, questionIds: readonly string[]) {
  const viewed = new Set(state.sessionKey === JSON.stringify(questionIds) ? state.viewedIds : [])
  const unviewedIds = questionIds.filter((id) => !viewed.has(id))
  return {
    allViewed: questionIds.length > 0 && unviewedIds.length === 0,
    unviewedCount: unviewedIds.length,
    firstUnviewedIndex: questionIds.findIndex((id) => !viewed.has(id)),
  }
}

export function canMarkQuestions(allViewed: boolean, cause: 'manual' | 'timer' = 'manual') {
  return allViewed || cause === 'timer'
}
