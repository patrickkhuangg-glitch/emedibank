import { validWorkerSecret } from '@/lib/interviews/worker-auth'
import { processInterviewJob } from '@/lib/interviews/jobs'
export const runtime='nodejs'
export const maxDuration=120
export async function GET(request:Request){
 if(!validWorkerSecret(request.headers.get('authorization'),process.env.INTERVIEW_WORKER_SECRET))return Response.json({error:'Unauthorised'},{status:401})
 try{return Response.json(await processInterviewJob())}catch{return Response.json({error:'Queue unavailable'},{status:503})}
}
export const POST=GET
