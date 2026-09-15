import type { SafeQuestion, AnswerResult, GridResult, MostLeastResult } from '../access/questions'
import type { AnzPercentile } from '../ucat/benchmarks'

export type MockGraded =
  | { kind: 'mcq'; selectedId: string; result: AnswerResult }
  | { kind: 'grid'; answers: Record<string, 'Yes' | 'No'>; result: GridResult }
  | { kind: 'ml'; choice: { most: number; least: number }; result: MostLeastResult }

export type ReviewItem = {
  id: string; number: number; section: string; sectionName: string
  setId: string; setTitle: string; questionType: string
  question: SafeQuestion | null; graded?: MockGraded
  maximum: number; score: number | null; seconds: number
  status: 'correct' | 'partial' | 'incorrect' | 'unanswered' | 'unavailable'
}
export type ReviewSection = {
  name: string; slug: string; raw: number; maximum: number; complete: boolean
  scaled: number | null; percentile: AnzPercentile | null; band: number | null
  qrTopScoreRaw: 35 | 36
}

export function reviewGroups(items: ReviewItem[]) {
  const groups = new Map<string, { id: string; title: string; items: ReviewItem[] }>()
  for (const item of items) {
    const key = `${item.section}:${item.setId}`
    const group = groups.get(key) ?? { id: key, title: item.setTitle, items: [] }
    group.items.push(item)
    groups.set(key, group)
  }
  return [...groups.values()].map(group => ({ ...group, ...aggregateReview(group.items) }))
}

export function aggregateReview(items: ReviewItem[]) {
  const seconds = items.reduce((n, q) => n + q.seconds, 0)
  return {
    count: items.length,
    correct: items.filter(q => q.status === 'correct').length,
    raw: items.reduce((n, q) => n + (q.score ?? 0), 0),
    maximum: items.reduce((n, q) => n + q.maximum, 0),
    seconds, averageSeconds: items.length ? seconds / items.length : 0,
    complete: items.length > 0 && items.every(q => q.score != null),
  }
}

export function reviewByType(items: ReviewItem[]) {
  const types = new Map<string, ReviewItem[]>()
  for (const item of items) types.set(item.questionType, [...(types.get(item.questionType) ?? []), item])
  return [...types].map(([name, questions]) => ({ name, ...aggregateReview(questions) })).sort((a, b) => a.name.localeCompare(b.name))
}

export function formatQuestionTime(seconds: number) {
  const n = Math.round(Math.max(0, seconds))
  return n < 60 ? `${n}s` : `${Math.floor(n / 60)}m ${String(n % 60).padStart(2, '0')}s`
}

/** Each visit is accumulated. Switching to null excludes loading, marking and breaks.
 * The clock is injected so navigation and pause accounting can be tested precisely.
 */
export class QuestionTimeTracker {
  private current: string | null = null
  private since = 0
  private totals: Record<string, number> = {}
  switchTo(id: string | null, now: number) {
    if (this.current) this.totals[this.current] = (this.totals[this.current] ?? 0) + Math.max(0, now - this.since)
    this.current = id
    this.since = now
  }
  snapshot(now: number): Record<string, number> {
    const totals = { ...this.totals }
    if (this.current) totals[this.current] = (totals[this.current] ?? 0) + Math.max(0, now - this.since)
    return Object.fromEntries(Object.entries(totals).map(([id, ms]) => [id, ms / 1000]))
  }
}

/** Keep shared-stimulus groups intact, in first-seen order, before singles. */
export function groupedQuestionsFirst<T extends { id: string; stimulus_id: string | null }>(questions: T[]): T[] {
  const groups = new Map<string, T[]>()
  for (const q of questions) {
    const key = q.stimulus_id ? `set:${q.stimulus_id}` : `question:${q.id}`
    groups.set(key, [...(groups.get(key) ?? []), q])
  }
  return [...groups.values()].filter(group => group.length > 1).flat().concat([...groups.values()].filter(group => group.length === 1).flat())
}
