'use server'
import { isMMIFeedback,validateMMIFeedback } from './mmi-feedback'
import { mmiAttemptSource } from './mmi-evidence'
import { requireAdmin } from '@/lib/auth/dal'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { validateFeedback,validateDraftFeedback } from './marking-validation'
import { logInterview } from './jobs'
import type { InterviewResponseDisposition } from '@/lib/supabase/types'
import { nextInterviewReviewPath } from './next-review'
export async function reviewInterviewAction(id:string,version:number,action:'start'|'save'|'approve',feedback:unknown,notes:string,corrections:string,watched:boolean){
 const actor=await requireAdmin()
 try{
 const db=createAdminClient();const {data:attempt}=await db.from('interview_attempts').select('format,station_id,station_title,questions,station_snapshot,transcript,duration_seconds,response_disposition').eq('id',id).single()
 if(!attempt)return {ok:false,message:'Submission not found.'}
 const clean=action==='start'?null:action==='save'?validateDraftFeedback(feedback):validateFeedback(feedback,attempt.format)
 if(isMMIFeedback(clean)){if(attempt.format!=='mmi')throw new Error('invalid_mmi_format');validateMMIFeedback(clean,{draft:action==='save',stationId:attempt.station_id,source:mmiAttemptSource(attempt),durationSeconds:attempt.duration_seconds})}
 if(!Number.isInteger(version)||version<0||notes.length>20000||corrections.length>20000)throw new Error('invalid_input')
 if(action==='approve'&&watched!==true)return {ok:false,message:'Confirm that you reviewed the complete recording before release.'}
 const {data,error}=await db.rpc('review_interview_marking',{p_attempt_id:id,p_actor_id:actor.id,p_version:version,p_action:action,p_feedback:clean,p_notes:notes,p_corrections:corrections,p_watched:watched===true})
 if(error)throw error
 if(!['saved','released','already_released'].includes(data))return {ok:false,message:data==='conflict'?'Another reviewer changed this draft. Reload before editing.':data==='media_missing'?'The recording is missing. Restore access or mark ungradable.':'This submission cannot be changed in its current state.'}
 const nextPath=action==='approve'?await nextInterviewReviewPath(db):null
 revalidatePath('/admin/interviews');revalidatePath(`/admin/interviews/${id}`);revalidatePath('/interviews/mock-interviews/review')
 return {ok:true,status:data,version:version+1,nextPath}
 }catch{logInterview(id,'review','validation_or_save_failed');return {ok:false,message:'Check the feedback fields and evidence references. MMI v2 uses integer 1–7 scores or an explicit unscored status, source-backed evidence and a concise closing paragraph without exercises. Panel and earlier reports retain their original fields.'}}
}
export async function retryInterviewAction(id:string,stage:'transcribe'|'assess'|'audit'){
 const actor=await requireAdmin();const {data,error}=await createAdminClient().rpc('retry_interview_job',{p_attempt_id:id,p_actor_id:actor.id,p_job_type:stage})
 revalidatePath(`/admin/interviews/${id}`);revalidatePath('/admin/interviews')
 return {ok:!error&&['queued','already_running','already_ready'].includes(data??''),message:error?'The retry could not be queued.':data==='queued'?'Retry queued. Refresh to see processing progress.':data==='already_ready'?'The transcript is already ready.':data==='already_running'?'A job is already running.':'Required media or a previous processing stage is unavailable. Use manual marking if necessary.'}
}
export async function classifyMMIResponseAction(id:string,disposition:InterviewResponseDisposition){
 const actor=await requireAdmin()
 if(!/^[0-9a-f-]{36}$/i.test(id)||!['insubstantial','not_answered'].includes(disposition))return {ok:false,message:'Choose a valid response classification.'}
 const {data,error}=await createAdminClient().rpc('classify_mmi_response',{p_attempt_id:id,p_actor_id:actor.id,p_disposition:disposition})
 revalidatePath(`/admin/interviews/${id}`);revalidatePath('/admin/interviews')
 const ok=!error&&['saved','already_saved'].includes(data??'')
 return {ok,message:ok?(data==='already_saved'?'This response was already classified.':disposition==='not_answered'?'Saved as not answered. Review the classification, then start AI marking.':'Saved as an insubstantial response. Review the classification, then start AI marking.'):'This response can only be classified when its transcript has failed and the MMI submission needs attention.'}
}
export async function startMMIAssessmentAction(id:string){
 const actor=await requireAdmin()
 if(!/^[0-9a-f-]{36}$/i.test(id))return {ok:false,message:'Submission not found.'}
 const {data,error}=await createAdminClient().rpc('start_mmi_assessment',{p_attempt_id:id,p_actor_id:actor.id})
 revalidatePath(`/admin/interviews/${id}`);revalidatePath('/admin/interviews')
 return {ok:!error&&['queued','already_running'].includes(data??''),message:error?'AI marking could not be started.':data==='queued'?'AI marking queued. Refresh to see processing progress.':data==='already_running'?'AI marking is already queued or running.':'Confirm a failed empty response as insubstantial or not answered before starting AI marking.'}
}
export async function refundInterviewAction(id:string,reason:string){
 const actor=await requireAdmin()
 if(!reason.trim()||reason.length>1000)return {ok:false,message:'Enter a reason (up to 1,000 characters).'}
 const {data,error}=await createAdminClient().rpc('refund_interview_marking',{p_attempt_id:id,p_actor_id:actor.id,p_reason:reason})
 revalidatePath('/admin/interviews');revalidatePath(`/admin/interviews/${id}`);revalidatePath('/interviews/mock-interviews/review')
 return {ok:!error&&['refunded','already_refunded'].includes(data??''),message:!error&&['refunded','already_refunded'].includes(data??'')?'Marked ungradable; the marking credits were refunded once.':'This attempt cannot be refunded.'}
}
