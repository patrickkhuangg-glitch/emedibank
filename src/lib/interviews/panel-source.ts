import {mmiSource,type MMIReference} from './mmi-evidence'
import {mockMembership} from './mock-marking'
import type {InterviewResponseDisposition} from '@/lib/supabase/types'
export type PanelSequence={id:string;attempt_id:string;index:number;title:string;brief:string;questions:string[];transcript:string;duration_seconds:number|null;planned_seconds:number|null;availability:'available'|'missing'|'uncertain';response_disposition:InterviewResponseDisposition|null;references:MMIReference[]}
export type PanelSource={media_inspected:'transcript';completeness:'complete'|'excerpt'|'unknown';sequences:PanelSequence[];limitation:string}
export type PanelMember={id:string;user_id:string;format:string;station_title:string;station_snapshot:unknown;questions:unknown;transcript:string|null;transcription_status:string;duration_seconds:number;video_deleted_at:string|null;upload_status:string;response_disposition?:InterviewResponseDisposition|null}
const DISPOSITION_NOTES:Record<InterviewResponseDisposition,string>={
 insubstantial:'Recording note: A tutor reviewed the recording and confirmed that the candidate made an insubstantial response with too little assessable spoken content.',
 not_answered:'Recording note: A tutor reviewed the recording and confirmed that the candidate did not answer this question.',
}
/** Input is the canonical server-owned member set, never a client-provided transcript. */
export function wholePanelSource(members:PanelMember[],sessionId:string,userId:string):PanelSource{
 if(members.length<2||members.length>10||new Set(members.map(a=>a.id)).size!==members.length)throw new Error('invalid_panel_membership')
 const seen=new Set<number>()
 const sequences=members.map(a=>{
  const m=mockMembership(a.station_snapshot,'panel')
  if(a.user_id!==userId||a.format!=='panel'||!m||m.id!==sessionId||seen.has(m.index))throw new Error('invalid_panel_membership')
  seen.add(m.index)
  if(a.video_deleted_at||a.upload_status!=='ready')throw new Error('invalid_panel_media')
  const disposition=a.response_disposition??null
  if(disposition&&!['insubstantial','not_answered'].includes(disposition))throw new Error('invalid_panel_disposition')
  if(disposition&&a.transcript?.trim())throw new Error('conflicting_panel_response')
  if(!disposition&&(a.transcription_status!=='ready'||!a.transcript?.trim()))throw new Error('missing_panel_transcript')
  const s=a.station_snapshot as Record<string,unknown>,questions=Array.isArray(s.questions)?s.questions:a.questions
  if(!Array.isArray(questions)||!questions.length||questions.some(q=>typeof q!=='string'||!q.trim()))throw new Error('missing_panel_questions')
  const id=`Q${m.index+1}`,timing=s.timing as {response_seconds?:number}|undefined
  const transcript=disposition?DISPOSITION_NOTES[disposition]:a.transcript!
  const raw=mmiSource({preparation:s.preparation,questions},transcript,true)
  const refs=raw.references.map(r=>({...r,id:`${id}-${r.id}`}))
  const hasCandidate=refs.some(r=>r.speaker==='candidate'&&r.text.trim())
  return {id,attempt_id:a.id,index:m.index,title:a.station_title,brief:typeof s.preparation==='string'?s.preparation:'',questions:questions as string[],transcript,duration_seconds:Number.isFinite(a.duration_seconds)&&a.duration_seconds>0?a.duration_seconds:null,planned_seconds:typeof timing?.response_seconds==='number'?timing.response_seconds:null,availability:disposition||hasCandidate?'available':refs.some(r=>r.speaker==='recording_note')?'missing':'uncertain',response_disposition:disposition,references:refs} as PanelSequence
 }).sort((a,b)=>a.index-b.index)
 const missing=Array.from({length:10},(_,i)=>i).filter(i=>!seen.has(i)).map(i=>`Q${i+1}`)
 const classified=sequences.filter(s=>s.response_disposition).map(s=>`${s.id} (${s.response_disposition!.replace('_',' ')})`)
 return {media_inspected:'transcript',completeness:missing.length?'excerpt':'complete',sequences,limitation:(missing.length?`${members.length} of 10 responses were supplied. Missing recordings: ${missing.join(', ')}. Assess only supplied evidence; do not treat absent recordings as poor answers or invent their questions. No complete-interview global score can be given. `:'All ten saved response recordings are included. ')+(classified.length?`A tutor listened to and classified ${classified.join(', ')}; these are confirmed performance observations, not missing recordings. `:'')+'The automatic assessment inspects transcripts and tutor-confirmed response dispositions only. Interviewer follow-ups are unavailable unless explicitly recorded in the transcript. Recorded durations describe response length; question-change events do not locate spoken words.'}
}
/** The assessment plan sees only question context and known conditions, never candidate text. */
export function panelPlanInput(source:PanelSource){return {completeness:source.completeness,sequences:source.sequences.map(s=>({id:s.id,title:s.title,brief:s.brief,questions:s.questions,planned_seconds:s.planned_seconds})),limitation:'Infer a provisional task-based plan from these actual questions. Do not invent a standard university interview or extra primary tasks.'}}
