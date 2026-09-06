import {getUser} from '@/lib/auth/dal'
import {createClient} from '@/lib/supabase/server'
import {apiError,InterviewApiError,readSmallJson} from '@/lib/interviews/api'
import {validateStory,validStoryId} from '@/lib/interviews/stories'
export async function GET(){
 try{
  const user=await getUser();if(!user)throw new InterviewApiError('Sign in required.',401)
  const db=await createClient(),{data,error}=await db.from('interview_stories').select('*').eq('user_id',user.id).order('updated_at',{ascending:false})
  if(error)throw new InterviewApiError('Your story bank could not load. Please retry shortly.',503)
  return Response.json({stories:data},{headers:{'Cache-Control':'private, no-store'}})
 }catch(e){return apiError(e)}
}
export async function POST(request:Request){
 try{
  const user=await getUser();if(!user)throw new InterviewApiError('Sign in required.',401)
  const body=await readSmallJson(request);if(!validStoryId(body.id))throw new InterviewApiError('This story could not be identified. Please reopen the editor.')
  let draft;try{draft=validateStory(body)}catch(e){throw new InterviewApiError((e as Error).message)}
  const db=await createClient(),{data,error}=await db.from('interview_stories').insert({...draft,id:body.id,user_id:user.id}).select('*').single()
  if(error?.code==='23505'){
   const {data:existing}=await db.from('interview_stories').select('*').eq('id',body.id).eq('user_id',user.id).maybeSingle()
   if(existing&&Object.entries(draft).every(([key,value])=>existing[key as keyof typeof existing]===value))return Response.json({story:existing})
   throw new InterviewApiError('This story has already been saved or changed. Refresh your story bank before editing it.',409)
  }
  if(error)throw new InterviewApiError('Your story could not be saved. Keep your draft and retry.',503)
  return Response.json({story:data},{status:201})
 }catch(e){return apiError(e)}
}
