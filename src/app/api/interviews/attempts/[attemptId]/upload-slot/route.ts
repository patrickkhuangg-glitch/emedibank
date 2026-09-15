import {apiError,InterviewApiError,ownedAttempt,readSmallJson} from '@/lib/interviews/api'
export async function POST(request:Request,{params}:{params:Promise<{attemptId:string}>}){
 try{
  const {attemptId}=await params,{db,user,attempt}=await ownedAttempt(attemptId),body=await readSmallJson(request)
  if(typeof body.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id)||!['acquire','renew','release'].includes(String(body.action)))throw new InterviewApiError('Invalid upload request.')
  if(body.action!=='release'&&!['awaiting_upload','ready'].includes(attempt.upload_status))throw new InterviewApiError('This recording is no longer awaiting upload.',409)
  const {data,error}=await db.rpc('interview_upload_slot',{p_id:body.id,p_user:user.id,p_attempt:attemptId,p_action:String(body.action)})
  if(error)throw error
  return Response.json({granted:data===true},{headers:{'Cache-Control':'private, no-store'}})
 }catch(error){return apiError(error)}
}
