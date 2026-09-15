import { recordInterviewOperation } from '@/lib/interviews/operations'
import { validWorkerSecret } from '@/lib/interviews/worker-auth'
import { processInterviewJob } from '@/lib/interviews/jobs'
export const runtime='nodejs'
export const maxDuration=120
export async function GET(request:Request){
 if(!validWorkerSecret(request.headers.get('authorization'),process.env.INTERVIEW_WORKER_SECRET))return Response.json({error:'Unauthorised'},{status:401})
 const run=crypto.randomUUID();await recordInterviewOperation(run,'processing')
 try{const results=await Promise.allSettled(Array.from({length:4},()=>processInterviewJob()));if(results.some(r=>r.status==='rejected'))throw new Error('worker_unavailable');await recordInterviewOperation(run,'processing',results.some(r=>r.status==='fulfilled'&&'failed' in r.value&&r.value.failed)?'failed':'ok',results.filter(r=>r.status==='fulfilled'&&r.value.processed).length);return Response.json({workers:results.map(r=>r.status==='fulfilled'?r.value:null)})}catch{await recordInterviewOperation(run,'processing','failed');return Response.json({error:'Queue unavailable'},{status:503})}
}
export const POST=GET
