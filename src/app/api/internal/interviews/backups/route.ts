import {validWorkerSecret} from '@/lib/interviews/worker-auth'
import {runRecordingBackups} from '@/lib/interviews/recording-backups'
export const runtime='nodejs'
export const maxDuration=300
export async function GET(request:Request){
 const headers={'Cache-Control':'private, no-store'}
 if(!validWorkerSecret(request.headers.get('authorization'),process.env.CRON_SECRET)&&!validWorkerSecret(request.headers.get('authorization'),process.env.INTERVIEW_WORKER_SECRET))return Response.json({error:'Unauthorised'},{status:401,headers})
 try{
  const result=await runRecordingBackups()
  return Response.json(result,{status:!result.configured||result.failed?503:200,headers})
 }catch{return Response.json({error:'Recording backups unavailable'},{status:503,headers})}
}
export const POST=GET
