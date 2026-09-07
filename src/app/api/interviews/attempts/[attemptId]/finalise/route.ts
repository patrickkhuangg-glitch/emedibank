import { apiError,ownedAttempt,InterviewApiError,readSmallJson } from '@/lib/interviews/api'
import { validateMedia,validateDuration,validateQuestionEvents,baseMime } from '@/lib/interviews/video-validation'
export async function POST(request:Request,{params}:{params:Promise<{attemptId:string}>}) {
 try {
 const {attemptId}=await params;const {db,user,attempt}=await ownedAttempt(attemptId)
 if(attempt.upload_status==='ready')return Response.json({ok:true,attemptId,status:attempt.transcription_status})
 const body=await readSmallJson(request)
 const duration=validateDuration(body.durationSeconds,attempt.format)
 const events=validateQuestionEvents(body.questionEvents,Array.isArray(attempt.questions)?attempt.questions.length:0,duration)
 const bucket=db.storage.from('interview-recordings')
 const kind=attempt.media_kind==='audio'?'audio':'video'
 const {data:video,error}=await bucket.info(attempt.recording_path)
 if(error||!video)throw new InterviewApiError('Recording upload is not complete. Resume saving before finalising.',409)
 validateMedia((video.contentType ?? ''),(video.size ?? 0),kind)
 if(baseMime((video.contentType ?? ''))!==attempt.recording_mime_type)throw new InterviewApiError('Recording format does not match this attempt.')
 let hasAudio=kind==='audio'
 if(attempt.transcription_audio_path){
 const {data:audio}=await bucket.info(attempt.transcription_audio_path)
 if(audio){try{validateMedia((audio.contentType ?? ''),(audio.size ?? 0),'audio');hasAudio=true}catch{hasAudio=false}}
 }
 const {data:ok,error:saveError}=await db.rpc('finalise_interview_upload',{p_attempt_id:attemptId,p_user_id:user.id,p_duration:duration,p_events:events,p_has_audio:hasAudio})
 if(saveError||!ok)throw new InterviewApiError('The recording could not be finalised. Retry saving.',409)
 return Response.json({ok:true,attemptId,status:hasAudio?'processing':'failed'})
 }catch(error){return apiError(error)}
}
