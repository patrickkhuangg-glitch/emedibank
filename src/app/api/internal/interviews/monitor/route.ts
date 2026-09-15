import {validWorkerSecret} from '@/lib/interviews/worker-auth'
import {createAdminClient} from '@/lib/supabase/admin'
import {deliverInterviewAlerts} from '@/lib/interviews/operation-alerts'
export const runtime='nodejs'
export const maxDuration=90
export async function GET(request:Request){
 const headers={'Cache-Control':'private, no-store'}
 if(!validWorkerSecret(request.headers.get('authorization'),process.env.INTERVIEW_WORKER_SECRET)&&!validWorkerSecret(request.headers.get('authorization'),process.env.CRON_SECRET))return Response.json({error:'Unauthorised'},{status:401,headers})
 try{
  const {error}=await createAdminClient().rpc('check_interview_operations',{})
  if(error)throw Error('monitor_failed')
  const result=await deliverInterviewAlerts()
  return Response.json(result,{status:result.failed?503:200,headers})
 }catch{return Response.json({error:'Monitoring or alert delivery is unavailable.'},{status:503,headers})}
}
