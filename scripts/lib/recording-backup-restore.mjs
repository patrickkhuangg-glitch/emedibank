import {createHash} from 'node:crypto';
import {GetObjectCommand} from '@aws-sdk/client-s3';

// Run only with operator credentials. Bytes remain in memory and are never saved
// to a temporary file. Restoring does not renew retention or alter the transcript.
export async function restoreRecordingBackup({db,s3,bucket,attemptId,restore=false}) {
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(attemptId))throw Error('Invalid attempt ID');
 const eligibility=await db.rpc('interview_backup_eligible',{p_attempt:attemptId});
 if(eligibility.error||eligibility.data!==true)throw Error('Recording is no longer eligible for recovery');
 const manifest=await db.from('interview_recording_backups').select('object_key,status,bytes,sha256').eq('attempt_id',attemptId).single();
 if(manifest.error||manifest.data.status!=='ready')throw Error('Verified backup is not available');
 const m=manifest.data;
 if(m.object_key!==`recordings/${attemptId}`||!Number.isSafeInteger(m.bytes)||m.bytes<=0||m.bytes>150*1024*1024||!/^[a-f0-9]{64}$/.test(m.sha256))throw Error('Invalid backup receipt');
 const source=await db.from('interview_attempts').select('recording_path,recording_mime_type').eq('id',attemptId).single();
 if(source.error||!source.data.recording_path)throw Error('Recording metadata unavailable');
 const object=await s3.send(new GetObjectCommand({Bucket:bucket,Key:m.object_key}),{abortSignal:AbortSignal.timeout(90_000)});
 const chunks=[];let size=0;
 try{
  if(object.ContentLength!==m.bytes||!object.Body)throw Error('Backup size does not match receipt');
  for await(const chunk of object.Body){size+=chunk.length;if(size>m.bytes)throw Error('Backup is larger than receipt');chunks.push(Buffer.from(chunk));}
 }finally{object.Body?.destroy?.();}
 const bytes=Buffer.concat(chunks);
 if(size!==m.bytes||createHash('sha256').update(bytes).digest('hex')!==m.sha256)throw Error('Backup integrity check failed');
 if(!restore)return {verified:true,restored:false,bytes:size};
 // Recheck after download; an operator must never resurrect deleted/expired media.
 const current=await db.rpc('interview_backup_eligible',{p_attempt:attemptId});
 if(current.error||current.data!==true)throw Error('Recording expired during recovery');
 const storage=db.storage.from('interview-recordings');
 const written=await storage.upload(source.data.recording_path,bytes,{contentType:source.data.recording_mime_type,upsert:false});
 if(written.error)throw Error('Restore refused or failed; existing recordings are never overwritten');
 const final=await db.rpc('interview_backup_eligible',{p_attempt:attemptId});
 if(final.error||final.data!==true){
  // A deletion raced the upload. Remove only this newly inserted object.
  const removed=await storage.remove([source.data.recording_path]);
  if(removed.error)throw Error('Recovery raced expiry; operator must remove the newly restored object');
  throw Error('Recording expired during recovery; restored bytes removed');
 }
 return {verified:true,restored:true,bytes:size};
}
