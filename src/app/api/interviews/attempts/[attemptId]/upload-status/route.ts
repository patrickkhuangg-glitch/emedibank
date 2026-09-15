import {apiError,ownedAttempt,InterviewApiError,readSmallJson} from '@/lib/interviews/api'
import {baseMime,validateMedia} from '@/lib/interviews/media-validation'
import {recordingAvailable} from '@/lib/interviews/recording-retention'
// Confirm a lost upload acknowledgement without overwriting an existing object.
// The client cannot choose a bucket/path or inspect somebody else's recording.
export async function POST(request:Request,{params}:{params:Promise<{attemptId:string}>}){
 try{
 const {attemptId}=await params,{db,attempt}=await ownedAttempt(attemptId),body=await readSmallJson(request)
 if((body.kind!=='audio'&&body.kind!=='video')||typeof body.size!=='number'||!Number.isInteger(body.size)||typeof body.type!=='string')throw new InterviewApiError('Invalid recording details.')
 try{validateMedia(body.type,body.size,body.kind)}catch{throw new InterviewApiError('Invalid recording details.')}
 const reply=(uploaded:boolean)=>Response.json({uploaded},{headers:{'Cache-Control':'private, no-store'}})
 if(!['awaiting_upload','uploading','failed','ready'].includes(attempt.upload_status)||(attempt.upload_status==='ready'&&!recordingAvailable(attempt)))return reply(false)
 const kind=attempt.media_kind==='audio'?'audio':'video'
 const path=body.kind===kind?attempt.recording_path:kind==='video'&&body.kind==='audio'?attempt.transcription_audio_path:null
 if(!path||(body.kind===kind&&baseMime(body.type)!==baseMime(attempt.recording_mime_type)))return reply(false)
 const {data:object,error}=await db.storage.from('interview-recordings').info(path)
 return reply(!error&&!!object&&object.size===body.size&&baseMime(object.contentType??'')===baseMime(body.type))
 }catch(error){return apiError(error)}
}
