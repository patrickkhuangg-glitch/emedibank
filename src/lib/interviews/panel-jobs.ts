import 'server-only'
import {admitTrialProvider} from './trial-provider'
import {createAdminClient} from '@/lib/supabase/admin'
import {wholePanelSource} from './panel-source'
import {validateWholePanelFeedback,validatePanelAudit,type PanelAssessment} from './panel-feedback'
import {structuredInterviewRequest,ProviderError} from './provider'
import type {PanelJobRow} from '@/lib/supabase/types'
import {retryDelay} from './video-validation'
export async function processPanelJob(job:PanelJobRow,worker:string){
 const db=createAdminClient()
 try{
  const {data:m,error:markError}=await db.from('interview_mock_markings').select('*').eq('id',job.marking_id).single()
  if(markError||!m)throw new ProviderError('missing_panel_marking')
  if(!['queued','processing','needs_attention'].includes(m.status))throw new ProviderError('panel_marking_no_longer_pending')
  const {data:links,error:linkError}=await db.from('interview_mock_marking_members').select('attempt_id,sequence_index').eq('marking_id',m.id)
  if(linkError||(!links||links.length<2)||links.length>10)throw new ProviderError('invalid_panel_membership')
  const {data:members,error:memberError}=await db.from('interview_attempts').select('*').in('id',links.map(l=>l.attempt_id)).eq('user_id',m.user_id)
  if(memberError||!members||members.length!==links.length)throw new ProviderError('missing_panel_members')
  const source=wholePanelSource(members,m.mock_session_id,m.user_id)
  if(links.some(l=>source.sequences.find(s=>s.attempt_id===l.attempt_id)?.index!==l.sequence_index))throw new ProviderError('invalid_panel_membership')
  const {data:fingerprint,error:fpError}=await db.rpc('panel_source_fingerprint',{p_id:m.id})
  if(fpError||fingerprint!==m.source_fingerprint)throw new ProviderError('invalid_panel_source_changed')
  // Check every required object before spending provider quota; metadata alone is not media availability.
  const media=await Promise.all(members.map(a=>db.storage.from('interview-recordings').info(a.recording_path)))
  if(media.some(r=>r.error||!r.data))throw new ProviderError('missing_panel_media')
  await admitTrialProvider(m.user_id,members[0].id,job.job_type)
  const result=await structuredInterviewRequest('panel_complete',job.job_type,source,'',m.assessment)
  let payload
  if(job.job_type==='assess'){
   const assessment=result.value as PanelAssessment
   validateWholePanelFeedback(assessment.feedback,source,assessment.plan)
   payload={assessment,model:result.model}
  }else payload={audit:validatePanelAudit(result.value,source),model:result.model}
  const saved=await db.rpc('complete_panel_job',{p_job_id:job.id,p_worker:worker,p_payload:payload});if(saved.error)throw new ProviderError('panel_completion_failed')
  console.info(JSON.stringify({event:'whole_panel',markingId:m.id,jobId:job.id,stage:job.job_type,outcome:saved.data?'succeeded':'stale_result_ignored',requestId:result.requestId}))
  return {processed:true,panel:true}
 }catch(e){const code=e instanceof ProviderError?e.code:e instanceof Error&&/^(invalid_|missing_|insufficient_)/.test(e.message)?e.message:'panel_processing_failed'
 if(['trial_budget','trial_paused','trial_meter_unavailable'].includes(code)){
  const {error}=await db.rpc('defer_interview_trial_job',{p_job:job.id,p_worker:worker,p_panel:true})
  if(error)throw new ProviderError('trial_defer_failed')
  return {processed:true,deferred:true}
 }
  const failed=await db.rpc('fail_panel_job',{p_job_id:job.id,p_worker:worker,p_code:code,p_delay:retryDelay(job.attempt_count)})
  console.info(JSON.stringify({event:'whole_panel',markingId:job.marking_id,jobId:job.id,outcome:failed.error?'failure_persistence_failed':code}))
  return {processed:true,panel:true,failed:true}
 }
}
