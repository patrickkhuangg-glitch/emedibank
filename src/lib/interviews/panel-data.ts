import { recordingAvailable,recordingUrlLifetime } from './recording-retention'
import 'server-only'
import {requireAdmin} from '@/lib/auth/dal'
import {createAdminClient} from '@/lib/supabase/admin'
import {wholePanelMarkingEnabled} from './config'
import {WHOLE_PANEL_SCHEMA,type WholePanelFeedback} from './panel-feedback'
import {validateSchema} from './marking-validation'
import {createClient} from '@/lib/supabase/server'
export async function myPanelReport(sessionId:string){
 // Authenticated SQL function checks auth.uid(); private draft fields cannot be selected here.
 const db=await createClient(),{data,error}=await db.rpc('get_my_panel_report',{p_session_id:sessionId})
 if(error){if(!wholePanelMarkingEnabled()&&['PGRST202','42883'].includes(error.code))return null;return {sessionId,status:'unavailable',feedback:null}}
 if(!data||typeof data!=='object')return null
 const r=data as {sessionId:string;status:string;feedback:unknown}
 return {sessionId:r.sessionId,status:r.status,feedback:r.status==='released'&&validateSchema(r.feedback,WHOLE_PANEL_SCHEMA)?r.feedback as WholePanelFeedback:null}
}
export async function panelQueue(status?:string){
 await requireAdmin();const db=createAdminClient()
 const states:Array<import('@/lib/supabase/types').PanelMarkingRow['status']>=['waiting_transcripts','queued','processing','awaiting_review','in_review','needs_attention','released','ungradable']
 const {data,error}=await db.from('interview_mock_markings').select('id,mock_session_id,user_id,status,created_at,updated_at,lock_version').in('status',status&&states.some(s=>s===status)?[status as typeof states[number]]:states.filter(s=>!['released','ungradable'].includes(s))).order('created_at',{ascending:true}).limit(100)
 if(error)return {items:[],error:wholePanelMarkingEnabled()||!['PGRST205','42P01'].includes(error.code)}
 const ids=[...new Set((data??[]).map(m=>m.user_id))],{data:profiles}=ids.length?await db.from('profiles').select('id,full_name').in('id',ids):{data:[]}
 return {items:(data??[]).map(m=>({...m,student:profiles?.find(p=>p.id===m.user_id)?.full_name??'Student'})),error:false}
}
export async function panelReviewDetail(id:string){
 await requireAdmin();const db=createAdminClient(),{data:marking,error}=await db.from('interview_mock_markings').select('*').eq('id',id).maybeSingle()
 if(error||!marking)return null
 const [{data:links},{data:jobs},{data:events},{data:student}]=await Promise.all([db.from('interview_mock_marking_members').select('*').eq('marking_id',id).order('sequence_index'),db.from('interview_mock_processing_jobs').select('*').eq('marking_id',id),db.from('interview_mock_marking_events').select('*').eq('marking_id',id).order('created_at',{ascending:false}).limit(50),db.from('profiles').select('full_name').eq('id',marking.user_id).maybeSingle()])
 const ids=(links??[]).map(l=>l.attempt_id)
 const [{data:attempts},{data:transcriptionJobs}]=ids.length?await Promise.all([db.from('interview_attempts').select('*').in('id',ids).eq('user_id',marking.user_id),db.from('interview_processing_jobs').select('*').in('attempt_id',ids).eq('job_type','transcribe')]):[{data:[]},{data:[]}]
 const members=await Promise.all((links??[]).map(async l=>{const a=attempts?.find(a=>a.id===l.attempt_id);if(!a)return null;const {data}=recordingAvailable(a)?await db.storage.from('interview-recordings').createSignedUrl(a.recording_path,recordingUrlLifetime(a)):{data:null};return {...a,index:l.sequence_index,mediaUrl:data?.signedUrl??null}}))
 return {marking,members:members.filter(m=>m!==null),jobs:jobs??[],transcriptionJobs:transcriptionJobs??[],events:events??[],student:student?.full_name??'Student'}
}

export async function myPanelReportIndex(){
 const db=await createClient(),{data}=await db.rpc('get_my_panel_report_index',{})
 return Array.isArray(data)?data as Array<{sessionId:string;status:string}>:[]
}
