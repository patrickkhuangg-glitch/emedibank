import { interviewAccess } from './trial'
import { inspectTrialAudio } from './trial-media'
import { admitTrialProvider } from './trial-provider'
import {processPanelJob} from './panel-jobs'
import { isMMIFeedback,validateMMIAudit } from './mmi-feedback'
import { mmiDispositionTranscript } from './mmi-evidence'
import { MMI_RUBRIC_VERSION } from './mmi-rubric-v2'
import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { transcribeInterviewRecording } from './transcription'
import { structuredInterviewRequest,ProviderError } from './provider'
import { validateAssessment,validateAudit } from './marking-validation'
import { removeInterviewObjects } from './storage-cleanup'
import { RUBRIC_VERSION } from './marking-rubric'
import { retryDelay,validateMedia } from './video-validation'
import type { InterviewJobRow, PanelJobRow } from '@/lib/supabase/types'
export function logInterview(attemptId:string,stage:string,outcome:string,jobId?:string,requestId?:string) { console.info(JSON.stringify({event:'interview',attemptId,jobId,stage,outcome,requestId})) }
export async function processInterviewJob(cleanup=false) {
 const db=createAdminClient(),worker=crypto.randomUUID()
 const {data,error}=await db.rpc('claim_fair_interview_job',{p_worker:worker,p_cleanup:cleanup})
 if(error)throw new Error('queue_unavailable')
 const claimed=data as {queue:'attempt'|'panel';job:InterviewJobRow|PanelJobRow}|null
 if(!claimed)return {processed:false}
 if(claimed.queue==='panel')return processPanelJob(claimed.job as PanelJobRow,worker)
 const job=claimed.job as InterviewJobRow
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
 const access=await interviewAccess(a.user_id)
 if(access.kind!=='full'){
  const timing=(a.station_snapshot as {timing?:{response_seconds?:number}})?.timing
  const measured=await inspectTrialAudio(audio,Math.min(a.format==='mmi'?490:190,(timing?.response_seconds??(a.format==='mmi'?480:180))+10))
  await admitTrialProvider(a.user_id,a.id,'transcribe',measured.seconds,measured.fingerprint)
  const {error:durationError}=await db.from('interview_attempts').update({duration_seconds:measured.seconds}).eq('id',a.id)
  if(durationError)throw new ProviderError('trial_duration_save_failed')
 }
 const liveRoom=(a.station_snapshot as {live_room?:{transcript_mode?:unknown}}|null)?.live_room
 const result=await transcribeInterviewRecording(audio,meta.contentType,path.split('/').pop()!,{diarize:liveRoom?.transcript_mode==='speaker_diarized'})
 if('error' in result)throw new ProviderError(process.env.OPENAI_TRANSCRIPTION_API_KEY?'transcription_failed':'transcription_not_configured')
 if(result.text.length<12||result.text.split(/\s+/).length<Math.max(3,Math.min(20,Math.floor(a.duration_seconds/10)))||result.text.length>100000)throw new ProviderError('transcript_low_quality')
 payload={text:result.text,model:result.model};requestId=result.requestId
 }
 }else{
 const disposition=a.format==='mmi'&&!a.transcript?.trim()&&(a.response_disposition==='insubstantial'||a.response_disposition==='not_answered')?a.response_disposition:null
 const assessmentTranscript=a.transcript&&a.transcription_status==='ready'?a.transcript:disposition?mmiDispositionTranscript(disposition):null
 if(!assessmentTranscript)throw new ProviderError('transcript_missing')
 const questionCount=Array.isArray(a.questions)?a.questions.length:0
 const snapshot=a.station_snapshot&&Object.keys(a.station_snapshot).length?a.station_snapshot:{station_id:a.station_id,format:a.format,title:a.station_title,questions:a.questions,snapshot_version:0}
 const {data:marking,error:markError}=await db.from('interview_markings').select('ai_assessment').eq('attempt_id',a.id).single()
 if(markError)throw new ProviderError('marking_missing')
 await admitTrialProvider(a.user_id,a.id,job.job_type==='assess'?'assess':'audit')
 const result=await structuredInterviewRequest(a.format==='mmi'?'mmi_station':'panel_response',job.job_type==='assess'?'assess':'audit',{...snapshot,format:a.format,station_id:a.station_id,...(disposition?{response_disposition:disposition}:{})},assessmentTranscript,marking.ai_assessment)
 requestId=result.requestId
 if(job.job_type==='assess'){const assessment=validateAssessment(result.value,a.format,a.station_id,questionCount,a.duration_seconds);payload={assessment,model:result.model,rubric_version:isMMIFeedback(assessment.feedback)?MMI_RUBRIC_VERSION:RUBRIC_VERSION}}
 else{const primary=validateAssessment(marking.ai_assessment,a.format,a.station_id,questionCount,a.duration_seconds);payload={audit:isMMIFeedback(primary.feedback)?validateMMIAudit(result.value,primary.feedback):validateAudit(result.value,questionCount),feedback:primary.feedback,model:result.model}}
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
 if(['trial_budget','trial_paused','trial_meter_unavailable'].includes(code)){
  const {error}=await db.rpc('defer_interview_trial_job',{p_job:job.id,p_worker:worker,p_panel:false})
  if(error)throw new ProviderError('trial_defer_failed')
  return {processed:true,deferred:true}
 }
 const {error:saveError}=await db.rpc('fail_interview_job',{p_job_id:job.id,p_worker:worker,p_code:code,p_delay:retryDelay(job.attempt_count)})
 logInterview(job.attempt_id,job.job_type,saveError?'failure_persistence_failed':code,job.id,error instanceof ProviderError?error.requestId:undefined)
 return {processed:true,failed:true}
 }
}
async function finish(job:InterviewJobRow,worker:string,payload:unknown){const {data,error}=await createAdminClient().rpc('complete_interview_job',{p_job_id:job.id,p_worker:worker,p_payload:payload});if(error)throw new Error('completion_failed');return data}
