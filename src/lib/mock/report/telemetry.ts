import type { QuestionTrace, Response } from './types'
export function responseKey(answer: Response): string {
  return typeof answer === 'object' && answer !== null ? JSON.stringify(Object.entries(answer).sort(([a], [b]) => a.localeCompare(b))) : JSON.stringify(answer)
}
/** Records answer decisions after the first complete response, not each field used to construct a grid. */
export class MockTelemetry {
  private traces: Record<string, QuestionTrace> = {}
  visit(id: string, elapsed: number) { if (!this.traces[id]) this.traces[id] = { firstSeen: Math.max(0, elapsed), events: [] } }
  answer(id: string, answer: Response, complete: boolean, elapsed: number) {
    this.visit(id, elapsed)
    const trace = this.traces[id]
    if (!trace.events.length && !complete) return
    const previous = trace.events.at(-1)
    if (previous && responseKey(previous.answer) === responseKey(answer)) return
    if (trace.events.length >= 100) trace.events.splice(1, 1)
    trace.events.push({ answer: answer == null ? null : typeof answer === 'string' ? answer : { ...answer }, at: Math.max(0, elapsed) })
  }
  snapshot() { return structuredClone(this.traces) }
}
