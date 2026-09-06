import { getUser } from '@/lib/auth/dal'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { apiError,InterviewApiError,readSmallJson } from '@/lib/interviews/api'
import { interviewVideoEnabled } from '@/lib/interviews/config'
import { completeMock,fullMockMarkingCredits,type MockMarkingSummary } from '@/lib/interviews/mock-marking'
export const runtime='nodejs'
async function load(sessionId:string) {
 const user=await getUser();if(!user)throw new InterviewApiError('Sign in required.',401)
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId))throw new InterviewApiError('Mock interview not found.',404)
 const db=createAdminClient()
 const {data:attempts,error}=await db.from('interview_attempts').select('*').eq('user_id',user.id).eq('station_snapshot->mock_session->>id',sessionId).limit(11)
 if(error)throw error
 if(!attempts?.length)throw new InterviewApiError('Mock interview not found.',404)
 const {data:profile,error:profileError}=await db.from('profiles').select('mmi_credits').eq('id',user.id).single()
 if(profileError)throw profileError
 const complete=completeMock(attempts,sessionId),remaining=attempts.filter(a=>a.marking_status===null)
 const saved=attempts.filter(a=>a.upload_status==='ready'&&!a.video_deleted_at).length
 const summary:MockMarkingSummary={sessionId,createdAt:attempts[0].created_at,format:attempts[0].format,total:attempts[0].format==='mmi'?8:10,saved,remaining:remaining.length,cost:fullMockMarkingCredits(attempts),credits:profile?.mmi_credits??0,ready:complete&&saved===attempts.length&&interviewVideoEnabled(),submitted:complete&&remaining.length===0}
 return {db,attempts,remaining,summary}
}
export async function GET(_request:Request,{params}:{params:Promise<{sessionId:string}>}) {
 try{const {summary}=await load((await params).sessionId);return Response.json(summary,{headers:{'Cache-Control':'private, no-store'}})}catch(e){return apiError(e)}
}
export async function POST(request:Request,{params}:{params:Promise<{sessionId:string}>}) {
 try{
  if(!interviewVideoEnabled())throw new InterviewApiError('Marking submissions are currently unavailable.',503)
  const sessionId=(await params).sessionId,{db,remaining,summary}=await load(sessionId)
  const body=await readSmallJson(request)
  if(!Number.isInteger(body.expectedCredits)||Number(body.expectedCredits)<0||Number(body.expectedCredits)>12)throw new InterviewApiError('Refresh the marking cost before submitting.')
  if(!summary.submitted){
   if(!summary.ready)throw new InterviewApiError('Save every response before submitting the entire mock. No credits were spent.',409)
   if(summary.credits<summary.cost)throw new InterviewApiError(`You need ${summary.cost} Interview marking credits to submit this mock. No credits were spent.`,409)
   const media=await Promise.all(remaining.map(a=>db.storage.from('interview-recordings').info(a.recording_path)))
   if(media.some(r=>r.error||!r.data))throw new InterviewApiError('A recording is unavailable. No credits were spent.',409)
   if(remaining.length){const {error}=await db.from('interview_attempts').update({marking_preflight_at:new Date().toISOString()}).in('id',remaining.map(a=>a.id)).is('marking_status',null);if(error)throw error}
  }
  const client=await createClient(),{data,error}=await client.rpc('submit_mock_interview_for_marking',{p_session_id:sessionId,p_expected_credits:Number(body.expectedCredits)})
  if(error)throw new InterviewApiError('Whole-mock marking is temporarily unavailable. Your recordings are saved; please retry later.',503)
  const result=data as {status:string;charged?:number}
  if(!['submitted','already_submitted'].includes(result.status))throw new InterviewApiError(result.status==='no_credits'?'You do not have enough Interview marking credits. No credits were spent.':result.status==='quote_changed'?'The marking cost changed because a response was submitted separately. Refresh the cost and retry.':'The entire mock could not be submitted. No credits were spent; refresh and try again.',409)
  return Response.json(result)
 }catch(e){return apiError(e)}
}
