import 'server-only'
import type { createAdminClient } from '@/lib/supabase/admin'
import type { InterviewAttemptRow } from '@/lib/supabase/types'
import { organiseTranscript, transcriptLayoutKey, transcriptLayoutFailure } from './transcript-section-provider'
import { transcriptQuestions, validTranscriptLayout } from './transcript-sections'

export async function groupAttemptTranscript(attempt:Pick<InterviewAttemptRow,'id'|'user_id'|'transcript'|'questions'|'transcription_status'>,db:ReturnType<typeof createAdminClient>) {
 const questions=transcriptQuestions(attempt.questions),text=attempt.transcript
 if(attempt.transcription_status!=='ready'||!text||!questions.length)return {status:'unavailable',reason:'transcript_not_ready'}
 if(questions.length===1)return {status:'ready',transcript:text,questions,layout:{version:1,spans:[{start:0,end:text.length,questionIndex:0}]}}
 const requestId=crypto.randomUUID()
 // Recover pre-repair failures once, including exhausted retries. Only the authorised
 // attempt's disposable failed cache is removed; current failures carry a version marker.
 await db.from('interview_transcript_layouts').delete().eq('attempt_id',attempt.id).eq('status','failed').eq('model','')
 const {data,error}=await db.rpc('claim_interview_transcript_layout',{p_attempt_id:attempt.id,p_user_id:attempt.user_id,p_request_id:requestId})
 if(error)return {status:'unavailable',reason:'transcript_layout_cache'}
 const claim=data as {status:string;transcript?:string;questions?:unknown;layout?:unknown}
 if(!['claimed','ready'].includes(claim?.status))return {status:claim?.status==='processing'?'processing':'unavailable',reason:claim?.status==='processing'?undefined:'transcript_layout_retry_limit'}
 const source=claim.transcript,canonical=transcriptQuestions(claim.questions)
 if(!source||!canonical.length)return {status:'unavailable',reason:'transcript_layout_source'}
 // Cached sections remain readable if provider configuration becomes unavailable.
 if(claim.status==='ready')return validTranscriptLayout(claim.layout,source,canonical)?{status:'ready',transcript:source,questions:canonical,layout:claim.layout}:{status:'unavailable',reason:'transcript_layout_invalid_output'}
 try{
  if(!transcriptLayoutKey())throw new Error('not_configured')
  const {layout,model}=await organiseTranscript(source,canonical)
  const {data:saved,error:saveError}=await db.rpc('complete_interview_transcript_layout',{p_attempt_id:attempt.id,p_user_id:attempt.user_id,p_request_id:requestId,p_layout:layout,p_model:model})
  return saved&&!saveError?{status:'ready',transcript:source,questions:canonical,layout}:{status:'unavailable',reason:'transcript_layout_save'}
 }catch(error){
  const reason=!transcriptLayoutKey()?'transcript_layout_not_configured':transcriptLayoutFailure(error)
  await db.rpc('complete_interview_transcript_layout',{p_attempt_id:attempt.id,p_user_id:attempt.user_id,p_request_id:requestId,p_layout:null,p_model:`layout-v2:${reason}`})
  console.warn(JSON.stringify({event:'interview_transcript_layout',attemptId:attempt.id,code:reason}))
  return {status:'unavailable',reason}
 }
}
