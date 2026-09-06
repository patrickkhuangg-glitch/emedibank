import 'server-only'
import { mockMembership } from './mock-marking'
import type { InterviewMarkingStatus } from '@/lib/supabase/types'
import { requireAdmin } from '@/lib/auth/dal'
import { createAdminClient } from '@/lib/supabase/admin'
export async function interviewQueue(filters:{format?:string;status?:string;page?:number}={}) {
 await requireAdmin()
 const db=createAdminClient(),page=Math.max(0,Math.min(10000,filters.page??0))
 const active:InterviewMarkingStatus[]=['queued','processing','awaiting_review','in_review','needs_attention']
 const status=[...active,'released','ungradable'].includes(filters.status??'')?filters.status as InterviewMarkingStatus:undefined
 let query=db.from('interview_attempts').select('id',{count:'exact',head:true}).in('marking_status',status?[status]:active)
 if(filters.format==='mmi'||filters.format==='panel')query=query.eq('format',filters.format)
 const [{data:attempts,error},{count:total},{data:jobs,error:jobError},waiting,refunded,ready,queued,retrying,dead,oldest]=await Promise.all([
 db.rpc('list_interview_review_queue',{p_format:filters.format??'',p_status:status??'',p_offset:page*100}),
 query,
 db.from('interview_processing_jobs').select('attempt_id,status,job_type,attempt_count,available_at').in('status',['queued','running','failed','dead']).order('created_at',{ascending:true}).limit(1000),
 db.from('interview_attempts').select('id',{count:'exact',head:true}).in('marking_status',active),
 db.from('interview_attempts').select('id',{count:'exact',head:true}).eq('marking_status','ungradable'),
 db.from('interview_attempts').select('id',{count:'exact',head:true}).eq('marking_status','awaiting_review'),
 db.from('interview_processing_jobs').select('id',{count:'exact',head:true}).eq('status','queued'),
 db.from('interview_processing_jobs').select('id',{count:'exact',head:true}).eq('status','failed'),
 db.from('interview_processing_jobs').select('id',{count:'exact',head:true}).eq('status','dead'),
 db.from('interview_attempts').select('submitted_for_marking_at').in('marking_status',active).order('submitted_for_marking_at',{ascending:true}).limit(1).maybeSingle(),
 ])
 const attemptIds=(attempts??[]).map(a=>a.id)
 const {data:markings,error:markError}=attemptIds.length?await db.from('interview_markings').select('attempt_id,status,ai_assessment,evidence_audit,draft_feedback').in('attempt_id',attemptIds):{data:[],error:null}
 const counts={waiting:waiting.count??0,refunded:refunded.count??0,ready:ready.count??0,queued:queued.count??0,retrying:retrying.count??0,dead:dead.count??0}
 const sampledAt=Date.now(),oldestAt=oldest.data?.submitted_for_marking_at?Date.parse(oldest.data.submitted_for_marking_at):sampledAt
 if(error||markError||jobError)return {items:[],jobs:[],error:true,sampledAt,oldestAt,counts,total:0,page}
 const ids=[...new Set((attempts??[]).map(a=>a.user_id))]
 const {data:profiles}=ids.length?await db.from('profiles').select('id,full_name').in('id',ids):{data:[]}
 const readyState=(status:string|null)=>status==='awaiting_review'||status==='in_review'
 const items=(attempts??[]).map(attempt=>({attempt,student:profiles?.find(p=>p.id===attempt.user_id)?.full_name||'Student',marking:markings?.find(m=>m.attempt_id===attempt.id),jobs:(jobs??[]).filter(j=>j.attempt_id===attempt.id)})).sort((a,b)=>Number(readyState(b.attempt.marking_status))-Number(readyState(a.attempt.marking_status)))
 return {items,jobs:jobs??[],error:false,sampledAt,oldestAt,counts,total:total??0,page}
}
export async function interviewWaitingCount(){await requireAdmin();const {count}=await createAdminClient().from('interview_attempts').select('id',{count:'exact',head:true}).in('marking_status',['queued','processing','awaiting_review','in_review','needs_attention']);return count??0}
export async function interviewReviewDetail(id:string){
 await requireAdmin();const db=createAdminClient()
 const [{data:attempt},{data:marking},{data:jobs},{data:events}]=await Promise.all([
 db.from('interview_attempts').select('*').eq('id',id).maybeSingle(),db.from('interview_markings').select('*').eq('attempt_id',id).maybeSingle(),db.from('interview_processing_jobs').select('*').eq('attempt_id',id),db.from('interview_marking_events').select('*').eq('attempt_id',id).order('created_at',{ascending:false}).limit(50),
 ])
 if(!attempt||!marking)return null
 const {data:student}=await db.from('profiles').select('full_name').eq('id',attempt.user_id).maybeSingle()
 // Explicit admin guard above always precedes signing; URL is neither stored nor logged.
 const {data:media}=await db.storage.from('interview-recordings').createSignedUrl(attempt.recording_path,600)
 const mock=mockMembership(attempt.station_snapshot,attempt.format)
 const {data:related}=mock?await db.from('interview_attempts').select('id,station_title,station_snapshot,format,marking_status').eq('user_id',attempt.user_id).eq('station_snapshot->mock_session->>id',mock.id).not('marking_status','is',null).limit(10):{data:[]}
 const responses=(related??[]).map(a=>({...a,index:mockMembership(a.station_snapshot,a.format)?.index??0})).sort((a,b)=>a.index-b.index)
 return {attempt,marking,mock,responses,jobs:jobs??[],events:events??[],student:student?.full_name??'Student',mediaUrl:media?.signedUrl??null}
}
