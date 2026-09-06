import { getUser } from '@/lib/auth/dal'
import { createAdminClient } from '@/lib/supabase/admin'
import { interviewVideoEnabled } from '@/lib/interviews/config'
import { stationSnapshot,mediaExtension,baseMime } from '@/lib/interviews/video-validation'
import { apiError,InterviewApiError,readSmallJson } from '@/lib/interviews/api'
import { readMockSession,mockAttemptId } from '@/lib/interviews/mock-session'
export async function POST(request:Request) {
 try{
 const user=await getUser();if(!user)throw new InterviewApiError('Sign in required.',401)
 if(!interviewVideoEnabled())throw new InterviewApiError('Video recording is not available yet.',503)
 const body=await readSmallJson(request)
 const ticket=body.mockToken?readMockSession(body.mockToken,user.id):null
 const index=Number(body.mockIndex)
 const step=ticket&&Number.isInteger(index)?ticket.steps[index]:null
 if(ticket&&!step)throw new InterviewApiError('Invalid mock response.')
 if(ticket&&step){const responseAt=ticket.startedAt+ticket.steps.slice(0,index).reduce((n,s)=>n+s.preparationSeconds+s.responseSeconds,0)*1000+step.preparationSeconds*1000;if(Date.now()<responseAt)throw new InterviewApiError('This response has not started yet.',409)}
 const snapshot={...stationSnapshot(step?ticket!.format:body.format,step?.stationId??body.stationId,step?.questionIndex??0),
 ...(ticket&&step?{timing:{preparation_seconds:step.preparationSeconds,response_seconds:step.responseSeconds},mock_session:{id:ticket.id,mode:ticket.mode,index,total:ticket.steps.length,started_at:new Date(ticket.startedAt).toISOString()}}:{})}

 const videoType=String(body.videoType??''),audioType=String(body.audioType??'')
 const videoExt=mediaExtension(videoType,'video'),audioExt=audioType?mediaExtension(audioType,'audio'):null
 const id=ticket?mockAttemptId(ticket,index):crypto.randomUUID(),prefix=`${user.id}/${id}`
 const db=createAdminClient()
 if(ticket){
 const {data:existing,error:lookupError}=await db.from('interview_attempts').select('id,recording_path,transcription_audio_path,upload_status').eq('id',id).eq('user_id',user.id).maybeSingle()
 if(lookupError)throw lookupError
 if(existing)return Response.json({attemptId:id,videoPath:existing.recording_path,audioPath:existing.transcription_audio_path,uploadStatus:existing.upload_status})
 }
 const videoPath=`${prefix}/response.${videoExt}`,audioPath=audioExt?`${prefix}/transcription-audio.${audioExt}`:null
 const {error}=await db.from('interview_attempts').insert({id,user_id:user.id,format:snapshot.format,station_id:snapshot.station_id,station_title:snapshot.title,questions:snapshot.questions,recording_path:videoPath,recording_mime_type:baseMime(videoType),transcription_audio_path:audioPath,media_kind:'video',upload_status:'awaiting_upload',station_snapshot:snapshot})
 if(error?.code==='23505'&&ticket)throw new InterviewApiError('This response is already being prepared. Retry saving.',409)
 if(error?.message.includes('recording_daily_limit'))throw new InterviewApiError('You have reached your daily recording limit. Please try again tomorrow.',429)
 if(error?.message.includes('recording_storage_limit'))throw new InterviewApiError('Your recording storage is full. Delete older recordings from review and wait for cleanup before trying again.',429)
 if(error)throw error
 return Response.json({attemptId:id,videoPath,audioPath})
 }catch(error){return apiError(error)}
}
