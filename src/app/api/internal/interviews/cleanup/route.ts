import { validWorkerSecret } from '@/lib/interviews/worker-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { retentionDays } from '@/lib/interviews/video-validation'
import { cleanupTranscriptionAudio,cleanupPracticeAudioUploads } from '@/lib/interviews/storage-cleanup'
export const runtime='nodejs'
export const maxDuration=120
export async function GET(request:Request){
 if(!validWorkerSecret(request.headers.get('authorization'),process.env.INTERVIEW_WORKER_SECRET))return Response.json({error:'Unauthorised'},{status:401})
 try{
 const {data,error}=await createAdminClient().rpc('enqueue_interview_retention',{p_days:retentionDays(process.env.INTERVIEW_VIDEO_RETENTION_DAYS)})
 if(error)throw error
 await cleanupTranscriptionAudio()
 await cleanupPracticeAudioUploads()
 return Response.json({queued:data})
 }catch{return Response.json({error:'Cleanup unavailable'},{status:503})}
}
export const POST=GET
