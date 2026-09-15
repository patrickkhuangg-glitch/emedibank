import { isMMIFeedback,validateMMIFeedback,mmiBand,type MMIFeedback,type MMIHighlight } from './mmi-feedback'
export type MMIReportEntry={id:string;index:number;title:string;status:string;feedback:unknown}
export function mmiClosing(feedback:MMIFeedback,stationLabel?:string){
 const concerns=feedback.concerns.map(c=>`${stationLabel?`${stationLabel} — `:''}${c.status.replaceAll('_',' ')}: ${c.description} ${c.consequence}${c.repair?` Repair/context: ${c.repair}`:''}`)
 return [feedback.closing.verdict,feedback.closing.successful_improvement,...concerns].filter(Boolean).join(' ')
}
type SummaryHighlight=MMIHighlight & {station:number;sources:Array<{station:number;references:string[]}>}
function consolidate(items:Array<MMIHighlight & {station:number}>):SummaryHighlight[]{
 const result:SummaryHighlight[]=[]
 for(const item of items){
  const existing=result.find(h=>h.domain===item.domain&&h.text.trim()===item.text.trim())
  if(existing)existing.sources.push({station:item.station,references:item.references})
  else result.push({...item,sources:[{station:item.station,references:item.references}]})
 }
 return result.slice(0,5)
}
/** Reporting only: scores are never regenerated, domain-averaged, weighted or rounded before banding. */
export function aggregateMMI(entries:MMIReportEntry[],expectedTotal=entries.length){
 if(!Number.isInteger(expectedTotal)||expectedTotal<1||expectedTotal>20||new Set(entries.map(e=>e.id)).size!==entries.length||new Set(entries.map(e=>e.index)).size!==entries.length||entries.some(e=>!Number.isInteger(e.index)||e.index<0||e.index>=expectedTotal))throw new Error('invalid_mmi_circuit')
 const stations=Array.from({length:expectedTotal},(_,index)=>{
  const entry=entries.find(e=>e.index===index)
  let feedback:MMIFeedback|null=null
  if(entry&&entry.status==='released'&&isMMIFeedback(entry.feedback))try{feedback=validateMMIFeedback(entry.feedback)}catch{}
  const reason=feedback?.global.reason??(entry?.status==='released'?'Earlier or unreadable feedback format; retained separately and excluded from this rubric’s average.':'Awaiting approved feedback.')
  return {id:entry?.id??`missing-${index}`,index,title:entry?.title??`Station ${index+1}`,feedback,score:feedback?.global.score??null,reason}
 })
 const scored=stations.filter(s=>s.score!==null),sum=scored.reduce((n,s)=>n+s.score!,0),mean=scored.length?sum/scored.length:null
 const display=mean===null?null:(Math.floor((sum*10/scored.length)+.5)/10).toFixed(1)
 const band=mean===null?null:mmiBand(mean)
 let strengths=consolidate(stations.flatMap(s=>(s.feedback?.strengths??[]).map(h=>({...h,station:s.index+1}))))
 const concerns=stations.flatMap(s=>(s.feedback?.concerns??[]).map(c=>({...c,station:s.index+1})))
 let priorities=consolidate(stations.flatMap(s=>(s.feedback?.priorities??[]).map(h=>({...h,station:s.index+1}))).sort((a,b)=>Number(concerns.some(c=>c.station===b.station&&c.status==='serious_observed_concern'))-Number(concerns.some(c=>c.station===a.station&&c.status==='serious_observed_concern'))))
 const verdict=mean===null?`There is no scorable global result yet; coverage is 0 of ${expectedTotal} stations.`:scored.length===1?`The single scorable-station result is ${display}/7 (${band}), with coverage of 1 of ${expectedTotal}; this does not establish circuit consistency.`:`Across ${scored.length} of ${expectedTotal} stations, the descriptive practice average is ${display}/7 (${band}).`
 const improvement=stations.find(s=>s.index+1===priorities[0]?.station)?.feedback?.closing.successful_improvement??stations.find(s=>s.feedback)?.feedback?.closing.successful_improvement??'Further usable, reviewed evidence is needed to identify an improvement.'
 // Reuse an approved strength without inventing circuit-wide consistency or changing scores.
 const opening=strengths[0]?`Keep building on what you did well in Station ${strengths[0].station}. ${strengths[0].text}`:'You can use this feedback to take your next step.'
 const closing=expectedTotal===1&&stations[0].feedback?mmiClosing(stations[0].feedback):[opening,verdict,improvement,...concerns.map(c=>`Station ${c.station} — ${c.status.replaceAll('_',' ')}: ${c.description} ${c.consequence}${c.repair?` Repair/context: ${c.repair}`:''}`)].join(' ')
 // Keep the narrative concise; preserve every supported concern even in exceptional long reports.
 let budget=Math.max(0,260-closing.trim().split(/\s+/).length)
 const fit=<T extends {text:string}>(items:T[])=>items.filter(item=>{const words=item.text.trim().split(/\s+/).length+8;if(words>budget)return false;budget-=words;return true})
 priorities=fit(priorities);strengths=fit(strengths)
 return {stations,scorable:scored.length,total:expectedTotal,mean,display,band,roundingBoundary:mean!==null&&mmiBand(Number(display))!==band,strengths,priorities,concerns,closing}
}
