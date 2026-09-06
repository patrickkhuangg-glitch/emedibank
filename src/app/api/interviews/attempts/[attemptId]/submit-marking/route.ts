import { apiError,ownedAttempt,InterviewApiError,readSmallJson } from '@/lib/interviews/api'
import { createClient } from '@/lib/supabase/server'
import { interviewVideoEnabled } from '@/lib/interviews/config'
import { stationMarkingCredits } from '@/lib/interviews/mock-marking'
export async function POST(request:Request,{params}:{params:Promise<{attemptId:string}>}) {
 try{
 const {attemptId}=await params;const {db,attempt}=await ownedAttempt(attemptId)
 if(!interviewVideoEnabled())throw new InterviewApiError('Marking submissions are not available yet.',503)
 if(attempt.marking_status)return Response.json({status:'already_submitted'})
 const body=await readSmallJson(request)
 if(body.expectedCredits!==stationMarkingCredits(attempt.format))throw new InterviewApiError('The marking price has changed. Refresh this page before submitting. No credits were spent.',409)
 const {error:mediaError}=await db.storage.from('interview-recordings').info(attempt.recording_path)
 if(mediaError)throw new InterviewApiError('The recording is unavailable. No credit was spent.',409)
 const {error:preflightError}=await db.from('interview_attempts').update({marking_preflight_at:new Date().toISOString()}).eq('id',attemptId).is('marking_status',null)
 if(preflightError)throw preflightError
 const client=await createClient();const {data,error}=await client.rpc('submit_interview_for_marking',{p_attempt_id:attemptId,p_expected_credits:Number(body.expectedCredits)})
 if(error)throw error
 return Response.json({status:data},{status:data==='submitted'||data==='already_submitted'?200:409})
 }catch(error){return apiError(error)}
}
