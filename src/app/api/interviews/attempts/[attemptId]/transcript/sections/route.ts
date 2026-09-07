import { apiError, ownedAttempt, InterviewApiError } from '@/lib/interviews/api'
import { organiseTranscript, transcriptLayoutKey } from '@/lib/interviews/transcript-section-provider'
import { transcriptQuestions, validTranscriptLayout } from '@/lib/interviews/transcript-sections'
export const maxDuration = 45
const json = (value:unknown) => Response.json(value,{headers:{'Cache-Control':'private, no-store'}})
export async function POST(request:Request,{params}:{params:Promise<{attemptId:string}>}) {
 try {
  const {attemptId}=await params
  const {attempt,db,user}=await ownedAttempt(attemptId)
  if (request.headers.get('origin')!==new URL(request.url).origin) throw new InterviewApiError('Request origin is not allowed.',403)
  const questions=transcriptQuestions(attempt.questions),text=attempt.transcript
  if (attempt.transcription_status!=='ready'||!text||!questions.length) return json({status:'unavailable'})
  if (questions.length===1) return json({status:'ready',transcript:text,questions,layout:{version:1,spans:[{start:0,end:text.length,questionIndex:0}]}})
  // No key or migration? Keep the original transcript fully readable.
  if (!transcriptLayoutKey()) return json({status:'unavailable'})
  const requestId=crypto.randomUUID()
  const {data,error}=await db.rpc('claim_interview_transcript_layout',{p_attempt_id:attemptId,p_user_id:user.id,p_request_id:requestId})
  if (error) return json({status:'unavailable'})
  const claim=data as {status:string;transcript?:string;questions?:unknown;layout?:unknown}
  if (!['claimed','ready'].includes(claim?.status)) return json({status:claim?.status==='processing'?'processing':'unavailable'})
  const source=claim.transcript,canonical=transcriptQuestions(claim.questions)
  if (!source||!canonical.length) return json({status:'unavailable'})
  if (claim.status==='ready') return json(validTranscriptLayout(claim.layout,source,canonical)?{status:'ready',transcript:source,questions:canonical,layout:claim.layout}:{status:'unavailable'})
  try {
   const {layout,model}=await organiseTranscript(source,canonical)
   const {data:saved,error:saveError}=await db.rpc('complete_interview_transcript_layout',{p_attempt_id:attemptId,p_user_id:user.id,p_request_id:requestId,p_layout:layout,p_model:model})
   return json(saved&&!saveError?{status:'ready',transcript:source,questions:canonical,layout}:{status:'unavailable'})
  } catch {
   await db.rpc('complete_interview_transcript_layout',{p_attempt_id:attemptId,p_user_id:user.id,p_request_id:requestId,p_layout:null,p_model:''})
   return json({status:'unavailable'})
  }
 } catch(error) {return apiError(error)}
}
