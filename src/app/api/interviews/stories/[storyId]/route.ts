import {getUser} from '@/lib/auth/dal'
import {createClient} from '@/lib/supabase/server'
import {apiError,InterviewApiError,readSmallJson} from '@/lib/interviews/api'
import {validateStory,validStoryId} from '@/lib/interviews/stories'
type Context={params:Promise<{storyId:string}>}
async function change(request:Request,context:Context,remove:boolean){
 try{
  const user=await getUser();if(!user)throw new InterviewApiError('Sign in required.',401)
  const {storyId}=await context.params;if(!validStoryId(storyId))throw new InterviewApiError('Story not found.',404)
  const body=await readSmallJson(request);if(!Number.isSafeInteger(body.version)||Number(body.version)<1)throw new InterviewApiError('Refresh the story before changing it.')
  const db=await createClient()
  const {data:existing,error:readError}=await db.from('interview_stories').select('id,version').eq('id',storyId).eq('user_id',user.id).maybeSingle()
  if(readError)throw readError
  if(!existing)throw new InterviewApiError('Story not found.',404)
  if(existing.version!==body.version)throw new InterviewApiError('This story changed in another tab. Keep your draft and refresh the saved version.',409)
  let draft;try{if(!remove)draft=validateStory(body)}catch(e){throw new InterviewApiError((e as Error).message)}
  const operation=remove?db.from('interview_stories').delete():db.from('interview_stories').update(draft!)
  const {data,error}=await operation.eq('id',storyId).eq('user_id',user.id).eq('version',Number(body.version)).select('*').maybeSingle()
  if(error)throw new InterviewApiError('The change could not be saved. Please retry.',503)
  if(!data)throw new InterviewApiError('This story changed in another tab. Refresh before trying again.',409)
  return Response.json(remove?{ok:true}:{story:data})
 }catch(e){return apiError(e)}
}
export async function PATCH(request:Request,context:Context){return change(request,context,false)}
export async function DELETE(request:Request,context:Context){return change(request,context,true)}
