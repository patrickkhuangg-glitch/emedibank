import type { ReportFact } from './types'
const raw = (qs:ReportFact[])=>qs.reduce((n,q)=>n+q.score,0)
const max = (qs:ReportFact[])=>qs.reduce((n,q)=>n+q.maximum,0)
const pct = (qs:ReportFact[])=>max(qs)>0?Math.round(raw(qs)/max(qs)*100):null
export function timePressureMap(facts:ReportFact[]) {
 return [...new Set(facts.map(q=>q.section))].map(section=>{
  const qs=facts.filter(q=>q.section===section),budget=qs[0].budget,recommendedSeconds=budget/qs.length
  const windows=[{key:'five',label:'Final five minutes',seconds:Math.min(300,budget)},{key:'six',label:'Final six minutes',seconds:Math.min(360,budget)},{key:'portion',label:'Final 20%',seconds:budget*.2}].map(w=>{
   const boundary=budget-w.seconds
   // The five-minute view is strictly less than five minutes remaining.
   const inWindow=(at:number)=>w.key==='five'?at>boundary:at>=boundary
   const late=qs.filter(q=>q.answered&&q.finalAt!=null&&inWindow(q.finalAt)),early=qs.filter(q=>q.answered&&q.finalAt!=null&&!inWindow(q.finalAt))
   const completed=qs.filter(q=>q.answered&&q.completedAt!=null&&inWindow(q.completedAt)).length
   return {...w,earlyCount:early.length,lateCount:late.length,completed,earlyAccuracy:pct(early),lateAccuracy:pct(late),marksLost:max(late)-raw(late),maximum:max(late),ids:late.map(q=>q.id),smallSample:early.length<5||late.length<5}
  })
  const types=[...new Set(qs.map(q=>q.type))].map(name=>{
   const rows=qs.filter(q=>q.type===name),answered=rows.filter(q=>q.answered)
   return {name,count:rows.length,answered:answered.length,averageSeconds:answered.length?answered.reduce((n,q)=>n+q.seconds,0)/answered.length:null,recommendedSeconds}
  })
  return {section,name:qs[0].sectionName,budget,types,windows,unanswered:qs.filter(q=>!q.answered).length,unansweredMarks:qs.filter(q=>!q.answered).reduce((n,q)=>n+q.maximum,0),missingTiming:qs.filter(q=>q.answered&&q.finalAt==null).length,missingCompletionTiming:qs.filter(q=>q.answered&&q.completedAt==null).length,questions:qs.map(q=>({id:q.id,number:q.number,at:q.finalAt,answered:q.answered,status:!q.answered?'unanswered':q.score===q.maximum?'correct':q.score>0?'partial':'incorrect'}))}
 })
}
