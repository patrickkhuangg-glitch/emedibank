import {trialQuestionAllowed} from '@/lib/interviews/trial-catalog'
import { requireInterviewPractice } from '@/lib/interviews/trial'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUser } from '@/lib/auth/dal'
import { interviewVideoEnabled } from '@/lib/interviews/config'
import { readSmallJson, apiError, InterviewApiError } from '@/lib/interviews/api'
import { readMockSession, startMockSession } from '@/lib/interviews/mock-session'
import { makeMockSteps, makeTrialMockSteps, mockView } from '@/lib/interviews/mock-plan'
import type { MockSelection } from '@/lib/interviews/mock-types'
export const runtime='nodejs'
export async function POST(request:Request) {
 try {
  const user=await getUser();if(!user)throw new InterviewApiError('Sign in required.',401)
  if(!interviewVideoEnabled())throw new InterviewApiError('Mock interviews are not available yet.',503)
  if(request.headers.get('origin')!==new URL(request.url).origin)throw new InterviewApiError('Request origin is not allowed.',403)
  const body=await readSmallJson(request)
  if(body.action==='start') {
   const selection=body.selection as MockSelection
   const access=await requireInterviewPractice(user,selection?.mode==='individual'?selection.selectionId:undefined,0,false)
   const trial=access.kind!=='full'
   try{if(trial)makeTrialMockSteps(selection);else makeMockSteps(selection)}catch{throw new InterviewApiError('Choose an available station or mock format.',400)}
   if(trial)await requireInterviewPractice(user,undefined,0,true)
   const id=typeof body.startId==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.startId)?body.startId:crypto.randomUUID()
   let startedAt=Date.now()
   if(trial&&selection.mode==='full'){
    const {data:allowed,error}=await createAdminClient().rpc('claim_interview_trial_mock',{p_user:user.id,p_session:id,p_format:selection.format})
    if(error||!allowed)throw new InterviewApiError('You have already used this trial mock. You can still practise individual trial stations or upgrade for more mocks.',403)
    startedAt=(allowed as {startedAt:number}).startedAt
   }
   const {ticket,token}=startMockSession(user.id,selection,startedAt,trial,id)
   return Response.json({token,view:mockView(ticket,Date.now())},{headers:{'Cache-Control':'private, no-store'}})
  }
  let ticket
  try{ticket=readMockSession(body.token,user.id)}catch{throw new InterviewApiError('This mock session is invalid or expired. Start a new mock.',403)}
  const access=await requireInterviewPractice(user)
  if(access.kind!=='full'&&ticket.steps.some(step=>!trialQuestionAllowed(step.stationId,step.questionIndex??0)))throw new InterviewApiError('This mock requires full interview access.',403)
  // No requested index or client clock: only the currently timed content is returned.
  return Response.json({view:mockView(ticket,Date.now())},{headers:{'Cache-Control':'private, no-store'}})
 } catch(error) { return apiError(error) }
}
