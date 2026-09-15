import { responseKey } from './telemetry'
import type { Response, ReportFact } from './types'
export const CONFIDENCE_OPTIONS = ['Confident','Unsure','Guessed'] as const
export type Confidence = typeof CONFIDENCE_OPTIONS[number]
export type ConfidenceRecord = { value: Confidence; answerKey: string }
export const ERROR_CATEGORIES = ['Misread the question','Did not know the method','Calculation error','Ran out of time','Changed a correct answer','Guessed','Fell for a distractor'] as const
export type ErrorCategory = typeof ERROR_CATEGORIES[number]
export type ErrorAnnotation = { questionId: string; category: ErrorCategory }
export type ErrorSummary = { mocks: number; labelledErrors: number; unclassifiedErrors: number; classifiedMarks: number; rows: { category: ErrorCategory; count: number; marks: number }[] }
export function confidenceForAnswer(record: ConfidenceRecord | undefined, answer: Response): Confidence | null {
  return record && CONFIDENCE_OPTIONS.includes(record.value) && record.answerKey === responseKey(answer) ? record.value : null
}
export function summarizeErrors(mocks: { facts: Pick<ReportFact,'id'|'score'|'maximum'>[]; annotations: ErrorAnnotation[] }[]): ErrorSummary {
  const rows=ERROR_CATEGORIES.map(category=>({category,count:0,marks:0}))
  let unclassifiedErrors=0
  for(const mock of mocks) for(const q of mock.facts) {
    if(q.score>=q.maximum)continue
    const category=mock.annotations.find(a=>a.questionId===q.id)?.category,row=rows.find(r=>r.category===category)
    if(row){row.count++;row.marks+=q.maximum-q.score}else unclassifiedErrors++
  }
  return {mocks:mocks.length,labelledErrors:rows.reduce((n,r)=>n+r.count,0),unclassifiedErrors,classifiedMarks:rows.reduce((n,r)=>n+r.marks,0),rows}
}
export function confidenceCalibration(facts: ReportFact[]) {
  const recorded=facts.filter(q=>q.answered&&q.confidence)
  const groups=[
    {key:'confident-wrong',label:'Confident but not fully correct',guidance:'Possible misconception: revisit your reasoning.',rows:recorded.filter(q=>q.confidence==='Confident'&&q.score<q.maximum)},
    {key:'unsure-correct',label:'Unsure but correct',guidance:'Build certainty by explaining why your answer works.',rows:recorded.filter(q=>q.confidence==='Unsure'&&q.score===q.maximum)},
    {key:'guessed-correct',label:'Guessed correctly',guidance:'Review these even though they earned full marks.',rows:recorded.filter(q=>q.confidence==='Guessed'&&q.score===q.maximum)},
    {key:'confident-correct',label:'Confident and correct',guidance:'A mastery signal on these questions; confirm it with repeated practice.',rows:recorded.filter(q=>q.confidence==='Confident'&&q.score===q.maximum)},
    {key:'unsure-wrong',label:'Unsure and not fully correct',guidance:'Identify the missing evidence or method.',rows:recorded.filter(q=>q.confidence==='Unsure'&&q.score<q.maximum)},
    {key:'guessed-wrong',label:'Guessed and not fully correct',guidance:'Work through the explanation without a timer.',rows:recorded.filter(q=>q.confidence==='Guessed'&&q.score<q.maximum)},
  ]
  return { recorded:recorded.length,unrecorded:facts.length-recorded.length,groups:groups.map(g=>({key:g.key,label:g.label,guidance:g.guidance,count:g.rows.length,ids:g.rows.map(q=>q.id)})) }
}
