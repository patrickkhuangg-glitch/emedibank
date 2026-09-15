import { mockPostMortem } from './postmortem'
import { timePressureMap } from './pressure'
import { confidenceCalibration, summarizeErrors } from './reflection'
import type { MockReport, PaidReport, ReportCore, ReportFact, ReportHistory, TypeRow } from './types'
const sum = (rows: ReportFact[], key: 'score' | 'maximum' | 'seconds') => rows.reduce((n, q) => n + q[key], 0)
const accuracy = (rows: ReportFact[]) => rows.length && sum(rows, 'maximum') ? Math.round(sum(rows, 'score') / sum(rows, 'maximum') * 100) : null
const group = (rows: ReportFact[], key: (q: ReportFact) => string) => {
  const groups = new Map<string, ReportFact[]>()
  for (const q of rows) { const k = key(q); groups.set(k, [...(groups.get(k) ?? []), q]) }
  return [...groups.values()]
}
export function analyseMock(facts: ReportFact[]): { core: ReportCore; paid: PaidReport } {
  const sections = group(facts, q => q.section)
  const ranked = sections.map(qs => ({ name: qs[0].sectionName, accuracy: accuracy(qs) ?? 0 })).sort((a, b) => b.accuracy - a.accuracy)
  const types: TypeRow[] = group(facts, q => `${q.section}:${q.type}`).map(qs => {
    const sectionCount = sections.find(s => s[0].section === qs[0].section)!.length
    const attempted = qs.filter(q => q.answered)
    const averageSeconds = attempted.length ? sum(attempted, 'seconds') / attempted.length : null
    return { section: qs[0].section, sectionName: qs[0].sectionName, name: qs[0].type, count: qs.length, raw: sum(qs, 'score'), maximum: sum(qs, 'maximum'), accuracy: accuracy(qs) ?? 0, averageSeconds, paceRatio: averageSeconds == null ? null : averageSeconds / (qs[0].budget / sectionCount), lost: sum(qs, 'maximum') - sum(qs, 'score') }
  }).sort((a, b) => a.accuracy - b.accuracy || b.lost - a.lost || a.name.localeCompare(b.name))
  const focus = types[0]
  const slowest = sections.map(qs => ({ name: qs[0].sectionName, seconds: sum(qs, 'seconds'), budget: qs[0].budget, unanswered: qs.filter(q => !q.answered).length })).sort((a, b) => b.seconds / b.budget - a.seconds / a.budget)[0]
  const missed = facts.filter(q => q.score < q.maximum)
  const core: ReportCore = {
    strongest: ranked.length ? ranked.filter(s => s.accuracy === ranked[0].accuracy).map(s => s.name).join(' / ') : 'Not available',
    weakest: ranked.length ? ranked.filter(s => s.accuracy === ranked.at(-1)!.accuracy).map(s => s.name).join(' / ') : 'Not available',
    timingInsight: slowest ? `${slowest.name} used ${Math.round(slowest.seconds / slowest.budget * 100)}% of its time allowance, with ${slowest.unanswered} unanswered question${slowest.unanswered === 1 ? '' : 's'}.` : 'Timing is not available for this attempt.',
    recommendation: { section: focus?.section ?? '', sectionName: focus?.sectionName ?? '', type: focus?.name ?? '', minutes: 15, instruction: focus ? `Practise ${focus.name.toLowerCase()} in ${focus.sectionName}. Work without a timer first, then explain the evidence or calculation for each answer.` : 'Complete a mock to receive a recommendation.' },
    marks: { lost: sum(facts, 'maximum') - sum(facts, 'score'), maximum: sum(facts, 'maximum'), unanswered: sum(missed.filter(q => !q.answered), 'maximum'), incorrect: sum(missed.filter(q => q.answered && q.score === 0), 'maximum'), partial: missed.filter(q => q.score > 0).reduce((n, q) => n + q.maximum - q.score, 0) },
  }
  const pace = (q: ReportFact) => q.budget / sections.find(s => s[0].section === q.section)!.length
  const categories = [
    { name: 'Quick incorrect answers', rows: missed.filter(q => q.answered && q.score === 0 && q.seconds < pace(q) * .5), detail: 'Less than half the section’s equal-share time. Recheck the evidence; timing alone cannot tell whether you guessed.' },
    { name: 'Slow incorrect answers', rows: missed.filter(q => q.answered && q.score === 0 && q.seconds > pace(q) * 1.5), detail: 'More than 1.5 times the section’s equal-share time. Review the method and when to move on.' },
    { name: 'Partial-credit answers', rows: missed.filter(q => q.score > 0), detail: 'Some marks earned. Check which statement or judgement prevented full credit.' },
    { name: 'Incomplete responses', rows: facts.filter(q => q.partialResponse), detail: 'A grid or Most/Least response was left incomplete.' },
    { name: 'Unanswered questions', rows: facts.filter(q => !q.answered), detail: 'No complete response was submitted. These marks are not a prediction of what you would gain with more time.' },
  ]
  const changed = facts.filter(q => q.changes > 0 && q.firstScore != null)
  const queue = facts.filter(q=>q.score<q.maximum||(q.answered&&['Unsure','Guessed'].includes(q.confidence??''))).map(q => ({ id: q.id, number: q.number, section: q.section, sectionName: q.sectionName, type: q.type, lost: q.maximum - q.score, seconds: q.seconds, reason: q.score===q.maximum ? q.confidence==='Guessed' ? 'Guessed correctly — check your method' : 'Unsure but correct — explain your reasoning' : q.confidence==='Confident' ? 'Confident error — revisit your reasoning' : !q.answered ? 'Unanswered — try it without a timer' : q.firstScore != null && q.firstScore > q.score ? 'A changed answer lost marks' : q.score > 0 ? 'Partial credit — resolve the missing step' : q.seconds > pace(q) * 1.5 ? 'Time-intensive error — review the method' : 'Incorrect — check the evidence and method' })).sort((a, b) => b.lost - a.lost || b.seconds - a.seconds || a.number - b.number)
  const priority = types.filter(t => t.lost > 0)
  const plan = Array.from({ length: 7 }, (_, i) => {
    const t = (priority.length ? priority : types)[Math.floor(i / 2) % Math.max(1, (priority.length || types.length))]
    const name = t?.name ?? 'your questions'
    return { day: i + 1, title: i === 6 ? 'Check your progress' : i % 2 === 0 ? `Rebuild: ${name}` : `Timed practice: ${name}`, minutes: i === 6 ? 25 : 15, section: t?.section ?? '', detail: i === 6 ? 'Repeat a short mixed practice session. Compare accuracy and pace with this mock; note one method to keep.' : i % 2 === 0 ? `Review missed ${name.toLowerCase()} questions without a timer. Write the evidence or calculation that determines each answer.` : `Practise ${name.toLowerCase()} with a timer. Flag difficult questions, move on, then review every error.` }
  })
  return { core, paid: { postMortem:mockPostMortem(facts), types, timePressure:timePressureMap(facts), confidence:confidenceCalibration(facts), errors:summarizeErrors([{facts,annotations:[]}]), pressure: sections.map(qs => {
    const early = qs.filter(q => q.answered && q.finalAt != null && q.finalAt < q.budget * .8)
    const late = qs.filter(q => q.answered && q.finalAt != null && q.finalAt >= q.budget * .8)
    return { section: qs[0].section, name: qs[0].sectionName, earlyCount: early.length, lateCount: late.length, earlyAccuracy: accuracy(early), lateAccuracy: accuracy(late), lateUnanswered: qs.filter(q => !q.answered).length, budget: qs[0].budget }
  }), patterns: categories.map(c => ({ name: c.name, count: c.rows.length, detail: c.detail, ids: c.rows.map(q => q.id) })), changes: { questions: changed.length, helped: changed.filter(q => q.score > q.firstScore!).length, hurt: changed.filter(q => q.score < q.firstScore!).length, neutral: changed.filter(q => q.score === q.firstScore!).length, netMarks: changed.reduce((n, q) => n + q.score - q.firstScore!, 0), ids: changed.map(q => q.id) }, queue, plan, history: [] } }
}
/** Free payloads contain no premium analytics, even if callers inspect JSON. */
export function visibleMockReport(id: string, label: string, completedAt: string, facts: ReportFact[], paid: boolean, history: ReportHistory[] = []): MockReport {
  const result = analyseMock(facts)
  return { id, label, completedAt, access: paid ? 'paid' : 'free', confidenceChoices:Object.fromEntries(facts.filter(q=>q.confidence).map(q=>[q.id,q.confidence!])), core: paid ? result.core : { ...result.core, marks: { ...result.core.marks, unanswered: null, incorrect: null, partial: null } }, paid: paid ? { ...result.paid, history, postMortem:mockPostMortem(facts,history.filter(h=>h.id!==id&&Date.parse(h.completedAt)<Date.parse(completedAt)).sort((a,b)=>Date.parse(a.completedAt)-Date.parse(b.completedAt))) } : null }
}
