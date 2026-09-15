'use server'
import { getUser } from '@/lib/auth/dal'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyManifest } from '../token'
import { QR_TOP_SCORE_BY_FORM, findMiniMock, mocksForExam, ucatMockTitle } from '../config'
import { markScore, type QData } from '@/lib/access/questions'
import { gridMarkValue, questionMarkValue } from '@/lib/practice/marks'
import { hasPaidMockReport } from './access'
import { visibleMockReport } from './analyse'
import { confidenceForAnswer, ERROR_CATEGORIES, summarizeErrors, type ErrorAnnotation, type ErrorCategory } from './reflection'
import { mockPostMortem, type AnnotatedMock } from './postmortem'
import { historicalScores } from './comparison'
import { responseKey } from './telemetry'
import type { MockReport, ReportFact, ReportSubmission, Response, ReportHistory } from './types'

function validResponse(value: unknown): value is Response {
  if (value === null) return true
  if (typeof value === 'string') return value.length <= 80
  return typeof value === 'object' && !Array.isArray(value) && Object.keys(value!).length <= 10 && Object.entries(value!).every(([k, v]) => k.length <= 10 && (typeof v === 'string' && v.length <= 80 || typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 30))
}
function seconds(value: unknown, maximum: number) { return typeof value === 'number' && Number.isFinite(value) ? Math.min(maximum, Math.max(0, value)) : 0 }

export async function saveMockReport(token: string, input: ReportSubmission): Promise<MockReport> {
  const user = await getUser()
  if (!user) throw new Error('Sign in to save your report.')
  const manifest = verifyManifest(token, user.id)
  if (!manifest?.r || !manifest.k || manifest.q.length > 300) throw new Error('This mock report session has expired.')
  if (!input || !input.answers || !input.seconds || !input.traces || JSON.stringify(input).length > 400000) throw new Error('Invalid report data.')
  const db = createAdminClient()
  const { data: prior, error: priorError } = await db.from('mock_reports').select('id').eq('id', manifest.r).eq('user_id', user.id).maybeSingle()
  if (priorError) throw priorError
  if (prior) return readMockReport(manifest.r)
  const { data: exam, error: examError } = await db.from('exams').select('slug').eq('id', manifest.e).single()
  if (examError || !exam) throw new Error('Exam unavailable.')
  const mini = manifest.k.match(/^mini-(.+)-(\d+)$/)
  const form = mocksForExam(exam.slug).find(m => m.assignmentKey === manifest.k) ?? (mini ? findMiniMock(exam.slug, mini[1], `mini-${mini[2]}`) : null)
  if (!form) throw new Error('Mock form unavailable.')
  const [{ data: questions, error: questionError }, { data: options, error: optionError }, { data: subtests, error: subError }] = await Promise.all([
    db.from('questions').select('id,subtest_id,stimulus_id,tags,topic,data,published,difficulty').in('id', manifest.q),
    db.from('question_options').select('id,question_id,label,is_correct').in('question_id', manifest.q),
    db.from('subtests').select('id,slug,name').eq('exam_id', manifest.e),
  ])
  if (questionError || optionError || subError || questions?.length !== manifest.q.length) throw new Error('Question data could not be loaded.')
  const stimulusIds = [...new Set(questions.flatMap(q => q.stimulus_id ? [q.stimulus_id] : []))]
  const { data: stimuli, error: stimulusError } = stimulusIds.length ? await db.from('stimuli').select('id,data').in('id', stimulusIds) : { data: [], error: null }
  if (stimulusError) throw stimulusError
  const counts: Record<string, number> = {}
  const facts: ReportFact[] = manifest.q.map(id => {
    const q = questions.find(q => q.id === id)!, sub = subtests?.find(s => s.id === q.subtest_id)
    const section = form.sections.find(s => s.subtestSlug === sub?.slug)
    if (!q.published || !sub || !section) throw new Error('Question is not available in this exam.')
    const d = (q.data ?? {}) as QData, sd = (stimuli?.find(s => s.id === q.stimulus_id)?.data ?? {}) as QData
    const opts = (options ?? []).filter(o => o.question_id === id), correct = opts.find(o => o.is_correct)
    const maximum = d.statements?.length === 5 && sub.slug === 'decision-making' ? 2 : questionMarkValue(sub.slug, q.tags)
    const answer = input.answers[id] ?? null
    if (!validResponse(answer)) throw new Error('Invalid response.')
    const scoreAnswer = (v: Response) => {
      if (d.statements) return gridMarkValue(sub.slug, q.tags, d.statements.filter((s, i) => v && typeof v === 'object' && v[String(i)] === s.correct).length, d.statements.length)
      if (d.mostLeast) return v && typeof v === 'object' && v.most === d.mostLeast.correctMost && v.least === d.mostLeast.correctLeast ? 1 : 0
      if (typeof v !== 'string') return 0
      const selected = opts.find(o => o.id === v)
      if (!selected) return 0
      return markScore({ subtest_slug: sub.slug, tags: q.tags }, correct?.label, selected.label, selected.id === correct?.id)
    }
    const complete = d.statements ? !!answer && typeof answer === 'object' && d.statements.every((_, i) => ['Yes','No'].includes(String(answer[i]))) : d.mostLeast ? !!answer && typeof answer === 'object' && Number.isInteger(answer.most) && Number.isInteger(answer.least) && answer.most !== answer.least && [answer.most,answer.least].every(v => Number(v) >= 0 && Number(v) < d.mostLeast!.actions.length) : typeof answer === 'string' && opts.some(o => o.id === answer)
    // A partially completed grid is still marked; an incomplete Most/Least pair is unanswered.
    const hasFields = !!answer && typeof answer === 'object' && Object.keys(answer).length > 0
    const answered = complete || !!d.statements && hasFields
    const budget = section.minutes * 60, trace = input.traces[id]
    const events = Array.isArray(trace?.events) ? trace.events.slice(0, 100) : []
    if (events.some(e => !e || !validResponse(e.answer) || !Number.isFinite(e.at) || e.at < 0 || e.at > budget + 2)) throw new Error('Invalid answer history.')
    if (events.some((e, i) => i > 0 && e.at < events[i - 1].at)) throw new Error('Invalid answer order.')
    // A final changed response may be cleared. Include it once; never infer historical decisions.
    if (events.length && responseKey(events.at(-1)!.answer) !== responseKey(answer)) events.push({ answer, at: events.at(-1)!.at })
    const tables = sd.tables ?? d.tables ?? (sd.table ? [sd.table] : d.table ? [d.table] : [])
    const images = sd.images ?? d.images ?? (sd.image ? [sd.image] : d.image ? [d.image] : [])
    const type = sub.slug === 'quantitative-reasoning' ? q.tags?.find((t: string) => ['Tables','Diagrams','Complex','Text only'].includes(t)) ?? (images.length ? tables.length ? 'Complex' : 'Diagrams' : tables.length ? 'Tables' : 'Text only') : d.reasoning_family ?? q.tags?.[0] ?? q.topic ?? 'Uncategorised'
    return { id, difficulty:q.difficulty, number: counts[sub.slug] = (counts[sub.slug] ?? 0) + 1, section: sub.slug, sectionName: sub.name, type, setId: q.stimulus_id ?? id, maximum, score: answered ? scoreAnswer(answer) : 0, confidence: complete ? confidenceForAnswer(input.confidence?.[id],answer) : null, completedAt:events.length?seconds(events[0].at,budget):null, answered, seconds: seconds(input.seconds[id], budget), budget, firstSeen: trace?.firstSeen == null ? null : seconds(trace.firstSeen, budget), finalAt: events.length ? seconds(events.at(-1)!.at, budget) : null, changes: Math.max(0, events.length - 1), firstScore: events.length ? scoreAnswer(events[0].answer) : null, partialResponse: hasFields && !complete, format: d.statements ? 'grid' : d.mostLeast ? 'ml' : 'mcq' }
  })
  // Capped totals prevent clock jumps from manufacturing time-pressure claims.
  for (const section of form.sections) {
    const rows = facts.filter(q => q.section === section.subtestSlug), total = rows.reduce((n, q) => n + q.seconds, 0), budget = section.minutes * 60
    if (total > budget) for (const q of rows) q.seconds *= budget / total
  }
  const { error: insertError } = await db.from('mock_reports').upsert({ id: manifest.r, user_id: user.id, exam_id: manifest.e, form_key: form.assignmentKey, label: ucatMockTitle(form), facts }, { onConflict: 'id', ignoreDuplicates: true })
  if (insertError) throw insertError
  return readMockReport(manifest.r)
}

export async function readMockReport(id: string): Promise<MockReport> {
  const user = await getUser()
  if (!user || !/^[0-9a-f-]{36}$/i.test(id)) throw new Error('Report unavailable.')
  const db = createAdminClient()
  const { data: row, error } = await db.from('mock_reports').select('*').eq('id', id).eq('user_id', user.id).maybeSingle()
  if (error || !row) throw new Error('Report unavailable.')
  const paid = await hasPaidMockReport(user.id, row.exam_id)
  let history: ReportHistory[] = []
  let recentMocks:AnnotatedMock[] = [], priorFacts:ReportFact[]=[]
  const {data: currentAnnotations,error: annotationError}=await db.from('mock_error_classifications').select('question_id,category').eq('report_id',row.id)
  if(annotationError)throw annotationError
  const annotations:ErrorAnnotation[]=(currentAnnotations??[]).map(a=>({questionId:a.question_id,category:a.category as ErrorCategory}))
  let errorSummary=summarizeErrors([{facts:row.facts as ReportFact[],annotations}])
  if (paid) {
    const { data: previous, error: historyError } = await db.from('mock_reports').select('id,label,completed_at,form_key,facts').eq('user_id', user.id).eq('exam_id', row.exam_id).neq('id', row.id).lt('completed_at', row.completed_at).order('completed_at', { ascending: false }).limit(10)
    if (historyError) throw historyError
    const recent=[row,...(previous??[])].slice(0,5)
    const {data: recentAnnotations,error: recentError}=await db.from('mock_error_classifications').select('report_id,question_id,category').in('report_id',recent.map(r=>r.id))
    if(recentError)throw recentError
    recentMocks=recent.map(r=>({facts:r.facts as ReportFact[],annotations:(recentAnnotations??[]).filter(a=>a.report_id===r.id).map(a=>({questionId:a.question_id,category:a.category as ErrorCategory}))}))
    errorSummary=summarizeErrors(recentMocks)
    priorFacts=(previous??[]).flatMap(r=>r.facts as ReportFact[])
    history = [...(previous ?? []).reverse(), row].map(r => {
      const facts = r.facts as ReportFact[], maximum = facts.reduce((n, q) => n + q.maximum, 0)
      return { id: r.id, label: r.label, completedAt: r.completed_at, accuracy: maximum ? facts.reduce((n, q) => n + q.score, 0) / maximum * 100 : 0, seconds: facts.reduce((n, q) => n + q.seconds, 0), sameForm: r.form_key === row.form_key, ...historicalScores(facts, QR_TOP_SCORE_BY_FORM[r.form_key] ?? 36) }
    })
  }
  const result=visibleMockReport(row.id, row.label, row.completed_at, row.facts as ReportFact[], paid, history)
  result.annotations=annotations
  if(result.paid){result.paid.errors=errorSummary;result.paid.postMortem=mockPostMortem(row.facts as ReportFact[],history.filter(h=>h.id!==row.id),recentMocks,priorFacts,QR_TOP_SCORE_BY_FORM[row.form_key]??36)}
  return result
}


export async function classifyMockError(reportId:string,questionId:string,category:ErrorCategory|null):Promise<MockReport>{
 const user=await getUser()
 if(!user||! /^[0-9a-f-]{36}$/i.test(reportId)||! /^[0-9a-f-]{36}$/i.test(questionId))throw new Error('Review unavailable.')
 if(category!==null&&!ERROR_CATEGORIES.includes(category))throw new Error('Choose one of the listed reasons.')
 const db=createAdminClient()
 const {data:report,error}=await db.from('mock_reports').select('id,facts').eq('id',reportId).eq('user_id',user.id).maybeSingle()
 if(error||!report)throw new Error('Review unavailable.')
 const question=(report.facts as ReportFact[]).find(q=>q.id===questionId)
 if(!question||question.score>=question.maximum)throw new Error('Only questions with missed marks can be classified.')
 const result=category===null?await db.from('mock_error_classifications').delete().eq('report_id',reportId).eq('question_id',questionId):await db.from('mock_error_classifications').upsert({report_id:reportId,question_id:questionId,category,updated_at:new Date().toISOString()},{onConflict:'report_id,question_id'})
 if(result.error)throw new Error('Your classification could not be saved. Please try again.')
 return readMockReport(reportId)
}
