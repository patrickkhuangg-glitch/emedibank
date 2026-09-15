import { INTERVIEW_STATION_METADATA } from './station-metadata'
import type { MockDraft } from './mock-local'
export type FeedbackToRead = { id: string; title: string; href: string; releasedAt: string }
export type UnfinishedPractice = { stationId: string; format: 'mmi' | 'panel'; questionIndex: number; updatedAt: number }
export type ContinueAction = { kind: 'recording' | 'feedback' | 'practice'; title: string; description: string; label: string; href: string }
export type ContinueState = { practice?: UnfinishedPractice; seen: string[] }
const key = (userId: string) => `interview-continue-v1:${userId}`
export function readContinueState(userId: string): ContinueState {
  try {
    const state = JSON.parse(localStorage.getItem(key(userId)) ?? '{}')
    return { practice: state?.practice, seen: Array.isArray(state?.seen) ? state.seen.filter((id: unknown) => typeof id === 'string').slice(-500) : [] }
  } catch { return { seen: [] } }
}
function write(userId: string, state: ContinueState) {
  try { localStorage.setItem(key(userId), JSON.stringify(state)); window.dispatchEvent(new Event('interview-continue-changed')) } catch { /* Practice and feedback still work when browser storage is unavailable. */ }
}
export function rememberPractice(userId: string, practice: UnfinishedPractice) { write(userId, { ...readContinueState(userId), practice }) }
export function forgetPractice(userId: string, stationId: string, questionIndex: number, updatedAt: number) {
  const state = readContinueState(userId)
  if (state.practice?.stationId === stationId && state.practice.questionIndex === questionIndex && state.practice.updatedAt === updatedAt) write(userId, { seen: state.seen })
}
export function markFeedbackRead(userId: string, id: string) {
  const state = readContinueState(userId)
  if (!state.seen.includes(id)) write(userId, { ...state, seen: [...state.seen, id].slice(-500) })
}
export function chooseContinueAction(userId: string, drafts: MockDraft[], feedback: FeedbackToRead[], state: ContinueState, now = Date.now()): ContinueAction | null {
  const draft = drafts.filter(d => d.userId === userId && d.segments.some(s => !s.saved)).sort((a, b) => b.startedAt - a.startedAt)[0]
  if (draft) {
    const count = draft.segments.filter(s => !s.saved).length
    return { kind: 'recording', title: draft.format === 'mmi' ? 'Your MMI recordings' : 'Your panel recordings', description: `${count} ${count === 1 ? 'response is' : 'responses are'} waiting for you to review and save.`, label: 'Review recordings', href: `/interviews/mock-interviews/session?draft=${encodeURIComponent(draft.id)}` }
  }
  const report = feedback.filter(f => !state.seen.includes(f.id)).sort((a, b) => b.releasedAt.localeCompare(a.releasedAt))[0]
  if (report) return { kind: 'feedback', title: report.title, description: 'Your tutor has released feedback for this interview.', label: 'Read your feedback', href: report.href }
  const p = state.practice
  if (!p || !Number.isFinite(p.updatedAt) || now - p.updatedAt > 7 * 86400000 || p.updatedAt > now || !['mmi', 'panel'].includes(p.format)) return null
  const station = INTERVIEW_STATION_METADATA.find(s => s.format === p.format && s.id === p.stationId)
  if (!station || station.id !== p.stationId || (p.format === 'mmi' && p.questionIndex !== 0) || !Number.isInteger(p.questionIndex) || p.questionIndex < 0 || p.questionIndex >= station.questionCount) return null
  return { kind: 'practice', title: station.title, description: 'Return to your unfinished question. You can prepare again and start a fresh timer.', label: 'Return to question', href: `/interviews/practice/session?format=${p.format}&station=${encodeURIComponent(p.stationId)}${p.format === 'panel' ? `&question=${p.questionIndex}` : ''}` }
}
