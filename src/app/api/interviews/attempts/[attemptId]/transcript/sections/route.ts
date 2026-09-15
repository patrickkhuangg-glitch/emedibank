import { apiError, ownedAttempt, InterviewApiError } from '@/lib/interviews/api'
import { groupAttemptTranscript } from '@/lib/interviews/transcript-section-service'
export const maxDuration=45
export async function POST(request:Request,{params}:{params:Promise<{attemptId:string}>}) {
 try{
  const {attemptId}=await params
  const {attempt,db}=await ownedAttempt(attemptId)
  if(request.headers.get('origin')!==new URL(request.url).origin)throw new InterviewApiError('Request origin is not allowed.',403)
  const result=await groupAttemptTranscript(attempt,db)
  const {reason: _reason,...studentResult}=result
  void _reason
  return Response.json(studentResult,{headers:{'Cache-Control':'private, no-store'}})
 }catch(error){return apiError(error)}
}
