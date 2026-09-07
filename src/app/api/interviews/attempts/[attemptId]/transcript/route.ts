import { apiError,ownedAttempt,InterviewApiError } from '@/lib/interviews/api'
export async function POST(_request:Request,{params}:{params:Promise<{attemptId:string}>}) {
 try{
 const {attemptId}=await params;const {attempt,db,user}=await ownedAttempt(attemptId)
 if(attempt.transcription_status==='ready'&&attempt.transcript)return Response.json({transcript:attempt.transcript,questions:attempt.questions,status:'ready'},{headers:{'Cache-Control':'private, no-store'}})
 const {data,error}=await db.rpc('retry_interview_job',{p_attempt_id:attemptId,p_job_type:'transcribe',p_actor_id:user.id})
 if(error)throw error
 if(!['queued','already_running','already_ready'].includes(data))throw new InterviewApiError('Transcription is unavailable for this recording. You can still review any saved media.',409)
 return Response.json({status:'processing'})
 }catch(error){return apiError(error)}
}

export async function GET(_request:Request,{params}:{params:Promise<{attemptId:string}>}) {
 try {
  const {attemptId}=await params;const {attempt}=await ownedAttempt(attemptId)
  return Response.json({status:attempt.transcription_status,transcript:attempt.transcription_status==='ready'?attempt.transcript:null,questions:attempt.questions},{headers:{'Cache-Control':'private, no-store'}})
 }catch(error){return apiError(error)}
}
