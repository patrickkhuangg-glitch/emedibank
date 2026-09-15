import type { ReportFact, ReportHistory } from './types'
import type { ErrorAnnotation } from './reflection'
import { cognitiveTotal } from '../../ucat/scoring'
import { historicalScores } from './comparison'
import { estimateAnzPercentile } from '../../ucat/benchmarks'
import { timePressureMap } from './pressure'
export type AnnotatedMock = { facts: ReportFact[]; annotations: ErrorAnnotation[] }
const lost = (q: ReportFact) => Math.max(0, q.maximum - q.score)
const sumLost = (qs: ReportFact[]) => qs.reduce((n,q)=>n+lost(q),0)
const round = (n:number) => Math.round(n*10)/10
/** Descriptive opportunities and a personal-history planning estimate, never a causal promise. */
export function mockPostMortem(facts: ReportFact[], history: ReportHistory[] = [], recent: AnnotatedMock[] = [{facts,annotations:[]}], priorFacts: ReportFact[] = [], qrTop:35|36=36) {
 const sections=[...new Set(facts.map(q=>q.section))].map(slug=>{
  const qs=facts.filter(q=>q.section===slug),raw=qs.reduce((n,q)=>n+q.score,0),maximum=qs.reduce((n,q)=>n+q.maximum,0)
  return {slug,name:qs[0].sectionName,raw,maximum,accuracy:maximum?raw/maximum*100:0,lost:sumLost(qs),ids:qs.filter(q=>lost(q)>0).map(q=>q.id)}
 })
 const scoredSections=sections.map(s=>{try{return historicalScores(facts.filter(q=>q.section===s.slug),qrTop).sections[0]}catch(error){if(!(error instanceof RangeError))throw error;return {slug:s.slug,accuracy:s.accuracy,scaled:null}}})
 const scores={sections:scoredSections,totalScore:cognitiveTotal(Object.fromEntries(scoredSections.map(s=>[s.slug,s.scaled])))}
 const best=[...sections].sort((a,b)=>b.accuracy-a.accuracy),opportunity=[...sections].sort((a,b)=>b.lost/b.maximum-a.lost/a.maximum)
 const missed=facts.filter(q=>lost(q)>0),annotations=recent[0]?.annotations??[]
 const repeated=new Set(annotations.filter(a=>recent.slice(1).some(m=>m.annotations.some(b=>b.category===a.category&&m.facts.some(q=>q.id===b.questionId&&lost(q)>0)))).map(a=>a.category))
 const pace=(q:ReportFact)=>q.budget/facts.filter(v=>v.section===q.section).length
 // Display disjoint buckets: unanswered first, then easy, slow, and repeated reasons.
 const buckets=[{key:'unattempted',label:'Unattempted questions',match:(q:ReportFact)=>!q.answered},{key:'easy',label:'Easy questions missed',match:(q:ReportFact)=>q.difficulty==='easy'},{key:'slow',label:'Slow answers with missed marks',match:(q:ReportFact)=>q.seconds>pace(q)*1.5},{key:'repeated',label:'Repeated error categories',match:(q:ReportFact)=>annotations.some(a=>a.questionId===q.id&&repeated.has(a.category))}]
 const assigned=new Set<string>(),currentIds=new Set(facts.map(q=>q.id)),past=new Map<string,ReportFact>()
 // Input is newest first. Repeated questions count once; current-form questions never form their own baseline.
 for(const q of priorFacts)if(q.answered&&!currentIds.has(q.id)&&!past.has(q.id))past.set(q.id,q)
 const estimate=(q:ReportFact)=>{
  const sample=[...past.values()].filter(p=>p.section===q.section&&p.type===q.type&&p.difficulty===q.difficulty)
  if(sample.length<5)return null
  const rate=sample.reduce((n,p)=>n+p.score,0)/sample.reduce((n,p)=>n+p.maximum,0)
  return Math.min(lost(q),Math.max(0,q.maximum*rate-q.score))
 }
 const rows=buckets.map(b=>{
  const qs=missed.filter(q=>!assigned.has(q.id)&&b.match(q));qs.forEach(q=>assigned.add(q.id))
  const estimates=qs.map(estimate).filter((v):v is number=>v!==null)
  return {key:b.key,label:b.label,ids:qs.map(q=>q.id),marks:sumLost(qs),estimated:estimates.length?round(estimates.reduce((n,v)=>n+v,0)):null,covered:estimates.length}
 })
 const estimateValues=missed.filter(q=>assigned.has(q.id)).map(estimate).filter((v):v is number=>v!==null)
 const easy=missed.filter(q=>q.difficulty==='easy')
 const types=[...new Set(missed.map(q=>`${q.section}:${q.type}`))].map(key=>{
  const qs=missed.filter(q=>`${q.section}:${q.type}`===key)
  return {name:qs[0].type,section:qs[0].section,sectionName:qs[0].sectionName,marks:sumLost(qs),ids:qs.map(q=>q.id)}
 }).sort((a,b)=>b.marks-a.marks)
 const reasons=[...new Set(annotations.map(a=>a.category))].map(category=>{
  const qs=missed.filter(q=>annotations.some(a=>a.questionId===q.id&&a.category===category))
  return {category,marks:sumLost(qs),repeated:repeated.has(category)}
 }).filter(r=>r.marks>0).sort((a,b)=>b.marks-a.marks)
 const timing=timePressureMap(facts).map(s=>{
  const late=s.windows.find(w=>w.key==='five')!,slow=facts.filter(q=>q.section===s.section&&q.seconds>pace(q)*1.5)
  return {section:s.section,name:s.name,lateLost:late.marksLost,lateCount:late.lateCount,earlyAccuracy:late.earlyAccuracy,lateAccuracy:late.lateAccuracy,unanswered:s.unanswered,slowCount:slow.length,excessSeconds:round(slow.reduce((n,q)=>n+q.seconds-pace(q),0)),ids:slow.map(q=>q.id),missingTiming:s.missingTiming}
 })
 const previous=history.at(-1)
 const focus=types[0],second=types[1]??focus,slowest=[...timing].sort((a,b)=>(b.lateLost+b.unanswered)-(a.lateLost+a.unanswered)||b.excessSeconds-a.excessSeconds)[0]
 const sessions=facts.length?[
  {title:focus?`Rebuild ${focus.name.toLowerCase()}`:'Consolidate your strongest methods',minutes:15,section:focus?.section??sections[0].slug,ids:focus?.ids??[],detail:focus?`Work through missed ${focus.name.toLowerCase()} questions without a timer. Identify the information needed, show each step and explain why the distractors fail.`:'Explain the reasoning behind five correct answers, then try fresh questions of the same type.'},
  {title:`Pace practice: ${slowest?.name??sections[0].name}`,minutes:15,section:slowest?.section??sections[0].slug,ids:slowest?.ids??[],detail:'Practise with a timer. Use the section allowance divided by question count as a starting pace; flag time-consuming questions and return after a first pass.'},
  {title:reasons[0]?`Check: ${reasons[0].category.toLowerCase()}`:second?`Confirm ${second.name.toLowerCase()}`:'Check transfer to fresh questions',minutes:20,section:second?.section??sections[0].slug,ids:reasons[0]?missed.filter(q=>annotations.some(a=>a.questionId===q.id&&a.category===reasons[0].category)).map(q=>q.id):second?.ids??[],detail:'Review the target questions, then attempt fresh questions. Record confidence before marking and classify any remaining errors; compare accuracy and pace with this mock.'}
 ]:[]
 return {sections,scores:{...scores,percentile:scores.totalScore==null?null:estimateAnzPercentile('total',scores.totalScore)},best:best.filter(s=>s.accuracy===best[0]?.accuracy),largest:opportunity.filter(s=>s.lost>0&&Math.abs(s.lost/s.maximum-opportunity[0].lost/opportunity[0].maximum)<.00001),timing,easy:{ids:easy.map(q=>q.id),marks:sumLost(easy),unknownDifficulty:facts.filter(q=>!q.difficulty).length},types,reasons,sessions,comparison:previous?{label:previous.label,completedAt:previous.completedAt,sameForm:previous.sameForm,score:previous.totalScore??null,delta:previous.totalScore!=null&&scores.totalScore!=null?scores.totalScore-previous.totalScore:null,sections:sections.map(s=>({name:s.name,delta:previous.sections.find(p=>p.slug===s.slug)?.scaled!=null?(scores.sections.find(p=>p.slug===s.slug)?.scaled??0)-previous.sections.find(p=>p.slug===s.slug)!.scaled!:null}))}:null,opportunities:{rows,total:rows.reduce((n,r)=>n+r.marks,0),other:sumLost(missed.filter(q=>!assigned.has(q.id))),estimated:estimateValues.length?round(estimateValues.reduce((n,v)=>n+v,0)):null,covered:estimateValues.length,count:assigned.size}}
}
