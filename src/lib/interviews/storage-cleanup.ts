import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type { InterviewAttemptRow } from '@/lib/supabase/types'
const BUCKET='interview-recordings'
// Capture every object below the opaque prefix, including unexpected partial objects.
// The caller first reserves the attempt so no new uploads can complete through RLS.
export async function removeInterviewObjects(a:Pick<InterviewAttemptRow,'id'|'user_id'|'recording_path'|'transcription_audio_path'>){
 const bucket=createAdminClient().storage.from(BUCKET),paths=new Set<string>([a.recording_path,...(a.transcription_audio_path?[a.transcription_audio_path]:[])])
 async function list(prefix:string,depth=0){
 if(depth>5)throw new Error('storage_depth_limit')
 for(let offset=0;;offset+=100){const {data,error}=await bucket.list(prefix,{limit:100,offset,sortBy:{column:'name',order:'asc'}});if(error)throw new Error('storage_list_failed');for(const item of data??[]){if(!item.id)await list(`${prefix}/${item.name}`,depth+1);else paths.add(`${prefix}/${item.name}`)}if(!data||data.length<100)break}
 }
 await list(`${a.user_id}/${a.id}`)
 const all=[...paths]
 for(let index=0;index<all.length;index+=100){const {error}=await bucket.remove(all.slice(index,index+100));if(error){console.error(JSON.stringify({event:'interview',attemptId:a.id,stage:'storage_cleanup',outcome:'failed'}));throw new Error('storage_cleanup_failed')}}
}
export async function deleteInterviewAttempt(a:InterviewAttemptRow){
 const db=createAdminClient()
 const {data:reserved,error}=await db.rpc('reserve_interview_deletion',{p_attempt_id:a.id,p_user_id:a.user_id})
 if(error||!reserved)throw new Error('delete_reservation_failed')
 await removeInterviewObjects(a)
 const {error:deleteError}=await db.from('interview_attempts').delete().eq('id',a.id).eq('user_id',a.user_id)
 if(deleteError)throw new Error('delete_failed')
}
export async function cleanupTranscriptionAudio(){
 const db=createAdminClient();const {data:attempts,error}=await db.from('interview_attempts').select('id,transcription_audio_path').eq('transcription_status','ready').not('transcription_audio_path','is',null).limit(100)
 if(error)throw new Error('cleanup_query_failed')
 for(const a of attempts??[]){if(!a.transcription_audio_path)continue;const {error:removeError}=await db.storage.from(BUCKET).remove([a.transcription_audio_path]);if(!removeError){const {error:updateError}=await db.from('interview_attempts').update({transcription_audio_path:null}).eq('id',a.id).eq('transcription_audio_path',a.transcription_audio_path);if(updateError)console.warn(JSON.stringify({event:'interview',attemptId:a.id,stage:'audio_cleanup',outcome:'pointer_retry_required'}))}}
}

// New practice audio uses the same upload shells. Reap abandoned shells only;
// completed audio and historical recordings keep their existing retention policy.
export async function cleanupPracticeAudioUploads(now = Date.now()) {
 const db=createAdminClient(),cutoff=new Date(now-24*60*60*1000).toISOString()
 const {data:attempts,error}=await db.from('interview_attempts').select('id').eq('media_kind','audio').eq('station_snapshot->>source','practice_audio').in('upload_status',['awaiting_upload','uploading','failed','discarded']).lt('created_at',cutoff).limit(100)
 if(error)throw new Error('practice_cleanup_query_failed')
 for(const candidate of attempts??[]){
  // Recheck under the UPDATE lock: a concurrent successful finalise must win
  // without its newly saved recording being deleted by an earlier scan.
  const {data:reserved,error:reserveError}=await db.from('interview_attempts').update({upload_status:'discarded'}).eq('id',candidate.id).eq('media_kind','audio').eq('station_snapshot->>source','practice_audio').in('upload_status',['awaiting_upload','uploading','failed','discarded']).lt('created_at',cutoff).select('*').maybeSingle()
  if(reserveError)throw new Error('practice_cleanup_reservation_failed')
  if(reserved)await deleteInterviewAttempt(reserved)
 }
}
