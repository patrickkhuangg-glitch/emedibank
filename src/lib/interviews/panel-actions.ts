'use server'
import {requireAdmin} from '@/lib/auth/dal'
import {createAdminClient} from '@/lib/supabase/admin'
import {revalidatePath} from 'next/cache'
import {validateWholePanelFeedback,type PanelAssessment} from './panel-feedback'
import type {InterviewResponseDisposition} from '@/lib/supabase/types'
import {nextInterviewReviewPath} from './next-review'
function refresh(id:string){revalidatePath('/admin/interviews');revalidatePath(`/admin/interviews/panels/${id}`);revalidatePath('/interviews/mock-interviews/review')}
export async function reviewPanelAction(id:string,version:number,action:'save'|'approve',feedback:unknown,notes:string,corrections:string,checks:{watched:boolean;mapping:boolean;evidence:boolean;audit:boolean}){
 const actor=await requireAdmin()
 try{
  if(!Number.isInteger(version)||version<0||!['save','approve'].includes(action)||typeof notes!=='string'||typeof corrections!=='string'||notes.length>20000||corrections.length>20000)throw new Error('invalid_input')
  const db=createAdminClient(),{data:m,error}=await db.from('interview_mock_markings').select('assessment').eq('id',id).single();if(error||!m)throw new Error('missing_panel')
  const a=m.assessment as PanelAssessment;if(a?.mode!=='panel_complete')throw new Error('invalid_panel_assessment')
  const clean=validateWholePanelFeedback(feedback,a.source,a.plan,{draft:action==='save'})
  if(action==='approve'&&(!checks||![checks.watched,checks.mapping,checks.evidence,checks.audit].every(c=>c===true)))return {ok:false,message:'Review all recordings, transcript mapping, decisive evidence and audit warnings before approving.'}
  const result=await db.rpc('review_whole_panel',{p_id:id,p_actor_id:actor.id,p_version:version,p_action:action,p_feedback:clean,p_notes:notes,p_corrections:corrections,p_watched:checks?.watched===true,p_mapping_checked:checks?.mapping===true,p_evidence_checked:checks?.evidence===true,p_audit_checked:checks?.audit===true})
  if(result.error)throw result.error
  if(!['saved','released','already_released'].includes(result.data))return {ok:false,message:result.data==='conflict'?'Another reviewer changed this draft. Reload before editing.':result.data==='source_changed'?'The source changed or a response is unavailable. Recheck the recordings before release.':'This panel cannot be saved or released in its current state.'}
  const nextPath=result.data==='released'?await nextInterviewReviewPath(db):null
  refresh(id);return {ok:true,status:result.data,version:version+1,nextPath,message:result.data==='saved'?'Draft saved.':'Whole-panel report released.'}
 }catch{return {ok:false,message:'Check the domain states, integer scores, source references and closing paragraph. Your edits have not been released.'}}
}
export async function retryPanelAction(id:string,stage:'assess'|'audit'){
 const actor=await requireAdmin(),{data,error}=await createAdminClient().rpc('retry_panel_job',{p_id:id,p_actor_id:actor.id,p_stage:stage});refresh(id)
 return {ok:!error&&['queued','already_queued'].includes(data??''),message:error?'Retry unavailable.':data==='queued'?'Retry queued.':data==='already_queued'?'Processing is already queued or running.':'Complete the transcripts first. Released, refunded or actively edited panels cannot be retried.'}
}
export async function classifyPanelResponseAction(id:string,attemptId:string,disposition:InterviewResponseDisposition){
 const actor=await requireAdmin()
 if(!/^[0-9a-f-]{36}$/i.test(id)||!/^[0-9a-f-]{36}$/i.test(attemptId)||!['insubstantial','not_answered'].includes(disposition))return {ok:false,message:'Choose a valid response classification.'}
 const {data,error}=await createAdminClient().rpc('classify_panel_response',{p_id:id,p_attempt_id:attemptId,p_actor_id:actor.id,p_disposition:disposition})
 refresh(id)
 const ok=!error&&['saved','already_saved'].includes(data??'')
 return {ok,message:ok?(data==='already_saved'?'This response was already classified.':disposition==='not_answered'?'Saved as not answered.':'Saved as an insubstantial response.'):'This response can only be classified while its transcript has failed and the panel is awaiting transcripts.'}
}
export async function refundPanelAction(id:string,reason:string){
 const actor=await requireAdmin();if(!reason.trim()||reason.length>2000)return {ok:false,message:'Enter a reason of up to 2,000 characters.'}
 const {data,error}=await createAdminClient().rpc('refund_whole_panel',{p_id:id,p_actor_id:actor.id,p_reason:reason});refresh(id)
 return {ok:!error&&['refunded','already_refunded'].includes(data??''),message:!error&&['refunded','already_refunded'].includes(data??'')?'Panel marked ungradable. Its credits were refunded once.':'This panel cannot be refunded.'}
}
