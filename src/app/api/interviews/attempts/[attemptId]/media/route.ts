import { getUser,getProfile,requireAdmin } from '@/lib/auth/dal'
import { createAdminClient } from '@/lib/supabase/admin'
import { apiError,InterviewApiError } from '@/lib/interviews/api'
export async function GET(_request:Request,{params}:{params:Promise<{attemptId:string}>}){
 try{
 const user=await getUser();if(!user)throw new InterviewApiError('Sign in required.',401)
 const {attemptId}=await params,db=createAdminClient()
 const profile=await getProfile()
 if(profile?.role==='admin')await requireAdmin()
 let query=db.from('interview_attempts').select('recording_path,video_deleted_at,upload_status').eq('id',attemptId)
 if(profile?.role!=='admin')query=query.eq('user_id',user.id)
 else query=query.not('marking_status','is',null)
 const {data:a}=await query.maybeSingle();if(!a||a.video_deleted_at||a.upload_status!=='ready')throw new InterviewApiError('Recording unavailable.',404)
 const {data,error}=await db.storage.from('interview-recordings').createSignedUrl(a.recording_path,600)
 if(error||!data)throw new InterviewApiError('Recording unavailable.',404)
 return Response.json({url:data.signedUrl},{headers:{'Cache-Control':'private, no-store'}})
 }catch(error){return apiError(error)}
}
