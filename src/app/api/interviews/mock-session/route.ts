import { getUser } from '@/lib/auth/dal'
import { interviewVideoEnabled } from '@/lib/interviews/config'
import { readSmallJson, apiError, InterviewApiError } from '@/lib/interviews/api'
import { readMockSession, startMockSession } from '@/lib/interviews/mock-session'
import { makeMockSteps, mockView } from '@/lib/interviews/mock-plan'
import type { MockSelection } from '@/lib/interviews/mock-types'
export const runtime='nodejs'
export async function POST(request:Request) {
 try {
  const user=await getUser();if(!user)throw new InterviewApiError('Sign in required.',401)
  if(!interviewVideoEnabled())throw new InterviewApiError('Mock interviews are not available yet.',503)
  const body=await readSmallJson(request)
  if(body.action==='start') {
   try{makeMockSteps(body.selection as MockSelection)}catch{throw new InterviewApiError('Choose an available station or mock format.',400)}
   const {ticket,token}=startMockSession(user.id,body.selection as MockSelection)
   return Response.json({token,view:mockView(ticket,Date.now())},{headers:{'Cache-Control':'private, no-store'}})
  }
  let ticket
  try{ticket=readMockSession(body.token,user.id)}catch{throw new InterviewApiError('This mock session is invalid or expired. Start a new mock.',403)}
  // No requested index or client clock: only the currently timed content is returned.
  return Response.json({view:mockView(ticket,Date.now())},{headers:{'Cache-Control':'private, no-store'}})
 } catch(error) { return apiError(error) }
}
