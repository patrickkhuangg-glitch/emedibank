import { getProfile } from '@/lib/auth/dal'
import { createAdminClient } from '@/lib/supabase/admin'
import { apiError, InterviewApiError } from '@/lib/interviews/api'
import { groupAttemptTranscript } from '@/lib/interviews/transcript-section-service'
export const maxDuration=45
export async function POST(request:Request,{params}:{params:Promise<{attemptId:string}>}) {
 try{
  const profile=await getProfile()
  if(!profile)throw new InterviewApiError('Sign in required.',401)
  if(profile.role!=='admin')throw new InterviewApiError('Reviewer access required.',403)
  if(request.headers.get('origin')!==new URL(request.url).origin)throw new InterviewApiError('Request origin is not allowed.',403)
  const {attemptId}=await params,db=createAdminClient()
  const [{data:attempt,error},{data:marking,error:markError}]=await Promise.all([
   db.from('interview_attempts').select('*').eq('id',attemptId).maybeSingle(),
   db.from('interview_markings').select('attempt_id').eq('attempt_id',attemptId).maybeSingle(),
  ])
  if(error||markError)throw new Error('Review unavailable')
  if(!attempt||!marking||!attempt.submitted_for_marking_at||!attempt.marking_status)throw new InterviewApiError('Submission not found.',404)
  return Response.json(await groupAttemptTranscript(attempt,db),{headers:{'Cache-Control':'private, no-store'}})
 }catch(error){return apiError(error)}
}
