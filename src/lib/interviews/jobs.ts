import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { transcribeInterviewRecording } from './transcription'
import { structuredInterviewRequest,ProviderError } from './provider'
import { validateAssessment,validateAudit,type Assessment } from './marking-validation'
import { removeInterviewObjects } from './storage-cleanup'
import { RUBRIC_VERSION } from './marking-rubric'
import { retryDelay,validateMedia } from './video-validation'
import type { InterviewJobRow } from '@/lib/supabase/types'
export function logInterview(attemptId:string,stage:string,outcome:string,jobId?:string,requestId?:string) { console.info(JSON.stringify({event:'interview',attemptId,jobId,stage,outcome,requestId})) }
export async function processInterviewJob() {
 const db=createAdminClient(),worker=crypto.randomUUID()
 const {data:jobs,error}=await db.rpc('claim_next_interview_job',{p_worker:worker})
 if(error)throw new Error('queue_unavailable')
 const job=jobs?.[0];if(!job)return {processed:false}
 logInterview(job.attempt_id,job.job_type,'claimed',job.id)
 try{
 const {data:a,error:loadError}=await db.from('interview_attempts').select('*').eq('id',job.attempt_id).single()
 if(loadError||!a)throw new ProviderError('attempt_unavailable')
 // Released/manual reviews must never be changed by a late assessment or audit.
 if((a.upload_status!=='ready'&&job.job_type!=='cleanup')||(job.job_type!=='transcribe'&&job.job_type!=='cleanup'&&!['queued','processing','needs_attention'].includes(a.marking_status??''))) {
 await finish(job,worker,{});return {processed:true}
 }
 let payload:unknown,requestId:string|undefined
 if(job.job_type==='cleanup'){
 if(a.upload_status!=='discarded')throw new ProviderError('cleanup_not_reserved')
 await removeInterviewObjects(a);payload={}
 }else if(job.job_type==='transcribe'){
 if(a.transcription_status==='ready'&&a.transcript){payload={text:a.transcript,model:a.transcription_model}}
 else{
 const path=a.media_kind==='video'?a.transcription_audio_path:a.recording_path
 if(!path)throw new ProviderError('audio_missing')
 const {data:meta,error:metaError}=await db.storage.from('interview-recordings').info(path)
 if(metaError||!meta||!meta.contentType||!meta.size)throw new ProviderError('audio_missing')
 // Legacy audio/ogg remains transcribable, but new video uploads have a narrow allowlist.
 if(a.media_kind==='video')validateMedia(meta.contentType,meta.size,'audio')
 else if(meta.size>24*1024*1024||!meta.contentType.startsWith('audio/'))throw new ProviderError('audio_unsupported')
 const {data:audio,error:downloadError}=await db.storage.from('interview-recordings').download(path)
 if(downloadError||!audio)throw new ProviderError('audio_download_failed')
 const {data:allowed,error:quotaError}=await db.rpc('consume_interview_transcription',{p_user_id:a.user_id})
 if(quotaError)throw new ProviderError('transcription_quota_unavailable')
 if(allowed!==true){
 const {error:deferError}=await db.rpc('defer_interview_transcription',{p_job_id:job.id,p_worker:worker})
 if(deferError)throw new ProviderError('transcription_defer_failed')
 logInterview(a.id,'transcribe','quota_deferred',job.id)
 return {processed:true,deferred:true}
 }
 const result=await transcribeInterviewRecording(audio,meta.contentType,path.split('/').pop()!)
 if('error' in result)throw new ProviderError(process.env.OPENAI_TRANSCRIPTION_API_KEY?'transcription_failed':'transcription_not_configured')
 if(result.text.length<12||result.text.split(/\s+/).length<Math.max(3,Math.min(20,Math.floor(a.duration_seconds/10)))||result.text.length>100000)throw new ProviderError('transcript_low_quality')
 payload={text:result.text,model:result.model};requestId=result.requestId
 }
 }else{
 if(!a.transcript||a.transcription_status!=='ready')throw new ProviderError('transcript_missing')
 const questionCount=Array.isArray(a.questions)?a.questions.length:0
 const snapshot=a.station_snapshot&&Object.keys(a.station_snapshot).length?a.station_snapshot:{station_id:a.station_id,format:a.format,title:a.station_title,questions:a.questions,snapshot_version:0}
 const {data:marking,error:markError}=await db.from('interview_markings').select('ai_assessment').eq('attempt_id',a.id).single()
 if(markError)throw new ProviderError('marking_missing')
 const result=await structuredInterviewRequest(job.job_type==='assess'?'assess':'audit',snapshot,a.transcript,marking.ai_assessment)
 requestId=result.requestId
 if(job.job_type==='assess')payload={assessment:validateAssessment(result.value,a.format,a.station_id,questionCount,a.duration_seconds),model:result.model,rubric_version:RUBRIC_VERSION}
 else{const primary=validateAssessment(marking.ai_assessment,a.format,a.station_id,questionCount,a.duration_seconds) as Assessment;payload={audit:validateAudit(result.value,questionCount),feedback:primary.feedback,model:result.model}}
 }
 const saved=await finish(job,worker,payload)
 if(saved&&job.job_type==='transcribe'&&a.transcription_audio_path){
 const {error:removeError}=await db.storage.from('interview-recordings').remove([a.transcription_audio_path])
 if(!removeError){const {error:updateError}=await db.from('interview_attempts').update({transcription_audio_path:null}).eq('id',a.id).eq('transcription_audio_path',a.transcription_audio_path);if(updateError)logInterview(a.id,'audio_cleanup','pointer_retry_required',job.id)}
 else logInterview(a.id,'audio_cleanup','retry_required',job.id)
 }
 logInterview(a.id,job.job_type,saved?'succeeded':'stale_result_ignored',job.id,requestId)
 return {processed:true}
 }catch(error){
 const code=error instanceof ProviderError?error.code:error instanceof Error&&/^(invalid_|missing_|insufficient_)/.test(error.message)?error.message:'processing_failed'
 const {error:saveError}=await db.rpc('fail_interview_job',{p_job_id:job.id,p_worker:worker,p_code:code,p_delay:retryDelay(job.attempt_count)})
 logInterview(job.attempt_id,job.job_type,saveError?'failure_persistence_failed':code,job.id,error instanceof ProviderError?error.requestId:undefined)
 return {processed:true,failed:true}
 }
}
async function finish(job:InterviewJobRow,worker:string,payload:unknown){const {data,error}=await createAdminClient().rpc('complete_interview_job',{p_job_id:job.id,p_worker:worker,p_payload:payload});if(error)throw new Error('completion_failed');return data}
