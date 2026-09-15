import {test} from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {Readable} from 'node:stream';
import {restoreRecordingBackup} from '../scripts/lib/recording-backup-restore.mjs';
const attemptId='b1000000-0000-4000-8000-000000000001',bytes=Buffer.from('Synthetic restore fixture');
function fixture({corrupt=false,eligible=[true,true,true],exists=false}={}){
 let writes=0,removes=0;
 const db={rpc:async()=>({data:eligible.shift()??true}),from:table=>({select:()=>({eq:()=>({single:async()=>({data:table==='interview_recording_backups'?{object_key:`recordings/${attemptId}`,status:'ready',bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}:{recording_path:'fixture/audio.webm',recording_mime_type:'audio/webm'}})})})}),storage:{from:()=>({upload:async(_path,body,options)=>{assert.equal(options.upsert,false);assert.deepEqual(body,bytes);writes++;return {error:exists?{}:null}},remove:async()=>{removes++;return {error:null}}})}};
 const s3={send:async()=>({ContentLength:bytes.length,Body:Readable.from([corrupt?Buffer.alloc(bytes.length):bytes])})};
 return {options:{db,s3,bucket:'private-test',attemptId},counts:()=>({writes,removes})};
}
test('restores verified bytes without overwriting objects; dry runs do not write',async()=>{
 const f=fixture();assert.equal((await restoreRecordingBackup(f.options)).verified,true);assert.equal(f.counts().writes,0);
 assert.equal((await restoreRecordingBackup({...f.options,restore:true})).restored,true);assert.equal(f.counts().writes,1);
 const existing=fixture({exists:true});await assert.rejects(restoreRecordingBackup({...existing.options,restore:true}),/never overwritten/);
});
test('refuses corrupt and expired backups and cleans an expiry race',async()=>{
 const corrupt=fixture({corrupt:true});await assert.rejects(restoreRecordingBackup({...corrupt.options,restore:true}),/integrity/);assert.equal(corrupt.counts().writes,0);
 const expired=fixture({eligible:[false]});await assert.rejects(restoreRecordingBackup({...expired.options,restore:true}),/no longer eligible/);
 const raced=fixture({eligible:[true,true,false]});await assert.rejects(restoreRecordingBackup({...raced.options,restore:true}),/restored bytes removed/);assert.deepEqual(raced.counts(),{writes:1,removes:1});
});
