import {getUser,getProfile} from '@/lib/auth/dal'
import {createClient} from '@/lib/supabase/server'
import {apiError,InterviewApiError,readSmallJson} from '@/lib/interviews/api'
import {INTRO_STATUSES,type IntroStatus} from '@/lib/interviews/introduction'
export async function POST(request:Request){
 try{
  const user=await getUser();if(!user)throw new InterviewApiError('Sign in required.',401)
  const profile=await getProfile();if(profile?.role!=='student')throw new InterviewApiError('Student account required.',403)
  const body=await readSmallJson(request)
  if(!INTRO_STATUSES.includes(body.status as IntroStatus))throw new InterviewApiError('Choose a valid introduction preference.')
  const client=await createClient()
  // Presentation preference only. Never used for access control, roles or entitlements.
  const {error}=await client.auth.updateUser({data:{interview_intro_v1:body.status}})
  if(error)throw new InterviewApiError('Your introduction preference could not be saved across devices. Please retry.',503)
  return Response.json({ok:true},{headers:{'Cache-Control':'private, no-store'}})
 }catch(e){return apiError(e)}
}
