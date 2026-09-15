import 'server-only'
import {createAdminClient} from '@/lib/supabase/admin'

type AdminClient=ReturnType<typeof createAdminClient>
type Candidate={path:string;submittedAt:string}

/** Oldest review-ready interview across individual and whole-panel queues. */
export async function nextInterviewReviewPath(db:AdminClient){
 const [{data:attempts},{data:panels}]=await Promise.all([
  db.rpc('list_interview_review_queue',{p_format:'',p_status:'',p_offset:0}),
  db.from('interview_mock_markings').select('id,status,created_at').in('status',['awaiting_review','in_review']).order('created_at',{ascending:true}).limit(100),
 ])
 const candidates:Candidate[]=[
  ...(Array.isArray(attempts)?attempts.filter(a=>a.marking_status==='awaiting_review'||a.marking_status==='in_review').map(a=>({path:`/admin/interviews/${a.id}`,submittedAt:a.submitted_for_marking_at??a.created_at})):[]),
  ...(Array.isArray(panels)?panels.map(p=>({path:`/admin/interviews/panels/${p.id}`,submittedAt:p.created_at})):[]),
 ]
 return candidates.sort((a,b)=>Date.parse(a.submittedAt)-Date.parse(b.submittedAt))[0]?.path??'/admin/interviews'
}
