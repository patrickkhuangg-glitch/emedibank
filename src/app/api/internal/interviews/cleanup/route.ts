import { recordInterviewOperation } from '@/lib/interviews/operations'
import { validWorkerSecret } from '@/lib/interviews/worker-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { processInterviewJob } from '@/lib/interviews/jobs'
import { cleanupTranscriptionAudio,cleanupPracticeAudioUploads } from '@/lib/interviews/storage-cleanup'
export const runtime='nodejs'
export const maxDuration=120
export async function GET(request:Request){
 if(!validWorkerSecret(request.headers.get('authorization'),process.env.INTERVIEW_WORKER_SECRET)&&!validWorkerSecret(request.headers.get('authorization'),process.env.CRON_SECRET))return Response.json({error:'Unauthorised'},{status:401})
 const run=crypto.randomUUID();await recordInterviewOperation(run,'cleanup')
 try{
 const {data,error}=await createAdminClient().rpc('enqueue_interview_retention',{p_days:7})
 if(error)throw error
 // Independent of provider throughput; two cleanup lanes drain at most 100 jobs.
 const deadline=Date.now()+80_000
 const results=await Promise.allSettled(Array.from({length:2},async()=>{
  let removed=0
  for(let i=0;i<50&&Date.now()<deadline;i++){
   const result=await processInterviewJob(true)
   if(!result.processed)break
   if('failed' in result&&result.failed)throw new Error('recording_cleanup_failed')
   removed++
  }
  return removed
 }))
 if(results.some(r=>r.status==='rejected'))throw new Error('recording_cleanup_failed')
 await cleanupTranscriptionAudio()
 await cleanupPracticeAudioUploads()
 await recordInterviewOperation(run,'cleanup','ok',results.reduce((a,b)=>a+(b.status==='fulfilled'?b.value:0),0))
 return Response.json({queued:data,processed:results.reduce((a,b)=>a+(b.status==='fulfilled'?b.value:0),0)})
 }catch{await recordInterviewOperation(run,'cleanup','failed');return Response.json({error:'Cleanup unavailable'},{status:503})}
}
export const POST=GET
