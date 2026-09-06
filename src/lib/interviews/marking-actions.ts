'use server'
import { requireAdmin } from '@/lib/auth/dal'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { validateFeedback,validateDraftFeedback } from './marking-validation'
import { logInterview } from './jobs'
export async function reviewInterviewAction(id:string,version:number,action:'start'|'save'|'approve',feedback:unknown,notes:string,corrections:string,watched:boolean){
 const actor=await requireAdmin()
 try{
 const db=createAdminClient();const {data:attempt}=await db.from('interview_attempts').select('format').eq('id',id).single()
 if(!attempt)return {ok:false,message:'Submission not found.'}
 const clean=action==='start'?null:action==='save'?validateDraftFeedback(feedback):validateFeedback(feedback,attempt.format)
 if(!Number.isInteger(version)||version<0||notes.length>20000||corrections.length>20000)throw new Error('invalid_input')
 if(action==='approve'&&watched!==true)return {ok:false,message:'Confirm that you reviewed the complete recording before release.'}
 const {data,error}=await db.rpc('review_interview_marking',{p_attempt_id:id,p_actor_id:actor.id,p_version:version,p_action:action,p_feedback:clean,p_notes:notes,p_corrections:corrections,p_watched:watched===true})
 if(error)throw error
 if(!['saved','released','already_released'].includes(data))return {ok:false,message:data==='conflict'?'Another reviewer changed this draft. Reload before editing.':data==='media_missing'?'The recording is missing. Restore access or mark ungradable.':'This submission cannot be changed in its current state.'}
 const {data:next}=await db.from('interview_attempts').select('id').in('marking_status',['awaiting_review','in_review']).neq('id',id).order('submitted_for_marking_at',{ascending:true}).limit(1).maybeSingle()
 revalidatePath('/admin/interviews');revalidatePath(`/admin/interviews/${id}`);revalidatePath('/interviews/mock-interviews/review')
 return {ok:true,status:data,version:version+1,nextId:next?.id??null}
 }catch{logInterview(id,'review','validation_or_save_failed');return {ok:false,message:'Complete the feedback fields with valid scores (1–7 in half steps), evidence, strengths, priorities and a practice task, then retry.'}}
}
export async function retryInterviewAction(id:string,stage:'transcribe'|'assess'|'audit'){
 const actor=await requireAdmin();const {data,error}=await createAdminClient().rpc('retry_interview_job',{p_attempt_id:id,p_actor_id:actor.id,p_job_type:stage})
 revalidatePath(`/admin/interviews/${id}`);revalidatePath('/admin/interviews')
 return {ok:!error&&['queued','already_running','already_ready'].includes(data??''),message:error?'The retry could not be queued.':data==='queued'?'Retry queued. Refresh to see processing progress.':data==='already_ready'?'The transcript is already ready.':data==='already_running'?'A job is already running.':'Required media or a previous processing stage is unavailable. Use manual marking if necessary.'}
}
export async function refundInterviewAction(id:string,reason:string){
 const actor=await requireAdmin()
 if(!reason.trim()||reason.length>1000)return {ok:false,message:'Enter a reason (up to 1,000 characters).'}
 const {data,error}=await createAdminClient().rpc('refund_interview_marking',{p_attempt_id:id,p_actor_id:actor.id,p_reason:reason})
 revalidatePath('/admin/interviews');revalidatePath(`/admin/interviews/${id}`);revalidatePath('/interviews/mock-interviews/review')
 return {ok:!error&&['refunded','already_refunded'].includes(data??''),message:!error&&['refunded','already_refunded'].includes(data??'')?'Marked ungradable; the credit was refunded once.':'This attempt cannot be refunded.'}
}
