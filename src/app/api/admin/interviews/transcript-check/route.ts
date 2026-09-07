import { getProfile } from '@/lib/auth/dal'
import { apiError, InterviewApiError } from '@/lib/interviews/api'
import { organiseTranscript, transcriptLayoutFailure, transcriptLayoutKey } from '@/lib/interviews/transcript-section-provider'
import { TRANSCRIPT_CHECK_SAMPLE, evaluateTranscriptCheck } from '@/lib/interviews/transcript-check-sample'
export const maxDuration=45
export async function POST(request:Request){
 try{
  const profile=await getProfile()
  if(!profile)throw new InterviewApiError('Sign in required.',401)
  if(profile.role!=='admin')throw new InterviewApiError('Reviewer access required.',403)
  if(request.headers.get('origin')!==new URL(request.url).origin)throw new InterviewApiError('Request origin is not allowed.',403)
  const json=(value:unknown)=>Response.json(value,{headers:{'Cache-Control':'private, no-store'}})
  if(!transcriptLayoutKey())return json({status:'unavailable',reason:'transcript_layout_not_configured'})
  // Fixed synthetic speech only: no request-supplied content, records, credits or user changes.
  try{
   const result=await organiseTranscript(TRANSCRIPT_CHECK_SAMPLE.transcript,TRANSCRIPT_CHECK_SAMPLE.questions)
   return json({status:'ready',...TRANSCRIPT_CHECK_SAMPLE,...result,quality:evaluateTranscriptCheck(result.layout)})
  }
  catch(error){return json({status:'unavailable',reason:transcriptLayoutFailure(error)})}
 }catch(error){return apiError(error)}
}
