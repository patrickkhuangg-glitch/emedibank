import { ROLEPLAY_ASSESSMENT_SCOPE } from './roleplay'
import { transcriptUnits } from './transcript-sections'
import type { InterviewResponseDisposition } from '@/lib/supabase/types'
export type MMISpeaker='candidate'|'interviewer'|'actor'|'recording_note'|'unknown'|'prompt'
export type MMIReference={id:string;speaker:MMISpeaker;text:string;start:number|null;end:number|null;timestamp:string|null;label_origin:'supplied'|'added'}
export type MMISource={media_assessed:'transcript';completeness:'complete'|'partial'|'unknown';primary_task_coverage:'full'|'excerpt'|'unknown';limitations:string[];references:MMIReference[];response_disposition?:InterviewResponseDisposition}
export function mmiDispositionTranscript(disposition:InterviewResponseDisposition){
 return disposition==='not_answered'
  ?'Recording note: An EMeducate tutor reviewed the complete recording and confirmed that the candidate did not answer this station. No candidate speech is supplied.'
  :'Recording note: An EMeducate tutor reviewed the complete recording and confirmed that the response was too insubstantial to produce a usable transcript. No candidate speech is supplied.'
}
/** Source labels and offsets are deterministic. No inferred speaker, timing or reconstructed speech. */
export function mmiSource(station:unknown,transcript:string,panelSpeakers=false,responseDisposition?:InterviewResponseDisposition|null):MMISource {
 const s=(station&&typeof station==='object'?station:{}) as Record<string,unknown>
 const supplied=s.evidence_scope as Record<string,unknown>|undefined
 const completeness=responseDisposition?'complete':['complete','partial'].includes(String(supplied?.completeness))?supplied!.completeness as 'complete'|'partial':'unknown'
 const coverage=responseDisposition?'full':['full','excerpt'].includes(String(supplied?.primary_task_coverage))?supplied!.primary_task_coverage as 'full'|'excerpt':'unknown'
 const references:MMIReference[]=[]
 if(typeof s.preparation==='string'&&s.preparation.trim())references.push({id:'P1',speaker:'prompt',text:s.preparation,start:null,end:null,timestamp:null,label_origin:'added'})
 if(Array.isArray(s.questions))s.questions.forEach((q,i)=>{if(typeof q==='string')references.push({id:`Q${i+1}`,speaker:'prompt',text:q,start:null,end:null,timestamp:null,label_origin:'added'})})
 // Support supplied turn labels and explicit speaker turns, including inline synthetic exchanges.
 const basePattern=/(?:^|\n|(?<=\s))(?:(S\d+-T\d+|T\d+)\s+)?(?:(\[?\d{1,2}:\d{2}(?::\d{2})?\]?)\s+)?(Candidate|Interviewer|Actor|Recording note|Unknown|Speaker\s+\d+)(?:\s*\((T\d+)\))?\s*:\s*/gim
 const pattern=panelSpeakers?new RegExp(basePattern.source.replace('Candidate|Interviewer|Actor','Candidate|Interviewer|Panel|Panellist|Actor'),basePattern.flags):basePattern
 const matches=[...transcript.matchAll(pattern)]
 const add=(start:number,end:number,speaker:MMISpeaker,label?:string,timestamp?:string)=>{
  if(!transcript.slice(start,end).trim())return
  let id=label??`S1-T${references.filter(r=>r.speaker!=='prompt').length+1}`
  if(references.some(r=>r.id===id))id=`${id}-${references.length+1}`
  references.push({id,speaker,text:transcript.slice(start,end),start,end,timestamp:timestamp??null,label_origin:label?'supplied':'added'})
 }
 if(matches.length){
  if(matches[0].index!>0)add(0,matches[0].index!,'unknown')
  matches.forEach((m,i)=>{const speaker=(/^(panel|panellist)$/i.test(m[3])?'interviewer':/^speaker\s+\d+$/i.test(m[3])?'unknown':m[3].toLowerCase().replace(' ','_')) as MMISpeaker;add(m.index!+m[0].length,matches[i+1]?.index??transcript.length,speaker,m[1]??m[4],m[2])})
 }else{
  for(const unit of transcriptUnits(transcript))add(unit.start,unit.end,/^\s*\[(?:recording|audio|inaudible|unavailable|silence)/i.test(unit.text)?'recording_note':'candidate')
 }
 return {media_assessed:'transcript',completeness,primary_task_coverage:coverage,limitations:[
  ...(s.response_mode==='roleplay_reflection'?[ROLEPLAY_ASSESSMENT_SCOPE]:[]),
  ...(responseDisposition?['The response disposition was confirmed by an EMeducate tutor after reviewing the complete recording; no candidate wording is available for automatic assessment.']:['Only the transcript was assessed automatically; audio and video must be checked by the reviewer.']),
  ...(!matches.length&&!responseDisposition?['Speaker turns are not supplied; local sentence labels were added. Listening and actor responses cannot be established.']:[]),
  ...(completeness==='unknown'?['Recording completeness is unknown. Missing speech is not evidence of an omitted answer.']:[]),
  ...(coverage==='excerpt'?['This is an excerpt; a whole-station global rating is not established.']:[]),
 ],references,...(responseDisposition?{response_disposition:responseDisposition}:{})}
}

/** Match the worker's fallback for recordings saved before station snapshots existed. */
export function mmiAttemptSource(attempt:{station_snapshot:unknown;station_id:string;format:string;station_title:string;questions:unknown;transcript:string|null;response_disposition?:InterviewResponseDisposition|null}):MMISource{
 const snapshot=attempt.station_snapshot&&typeof attempt.station_snapshot==='object'&&Object.keys(attempt.station_snapshot).length?attempt.station_snapshot:{station_id:attempt.station_id,format:attempt.format,title:attempt.station_title,questions:attempt.questions,snapshot_version:0}
 const disposition=!attempt.transcript?.trim()?attempt.response_disposition??null:null
 return mmiSource(snapshot,disposition?mmiDispositionTranscript(disposition):attempt.transcript??'',false,disposition)
}
