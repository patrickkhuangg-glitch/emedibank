import {test} from 'node:test'
import assert from 'node:assert/strict'
import * as nodeCrypto from 'node:crypto'
import * as streams from 'node:stream'
import {pipeline} from 'node:stream/promises'
import {fullDatabase} from './helpers/full-database.mjs'
import {loadModule} from './helpers/load-module.mjs'
const id=(n:number)=>`b1000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const digest='a'.repeat(64)
test('backup queue bounds leases, retries safely, protects pending marking, and deletes tombstones without removing transcripts',async()=>{
 const db=await fullDatabase()
 const claim=async(n:number)=>(await db.query<{r:{id:string;attempt_id:string;action:string}|null}>('select claim_interview_backup($1) r',[id(n)])).rows[0].r
 const finish=async(b:string,w:number)=>(await db.query<{r:boolean}>('select finish_interview_backup($1,$2,null,20,$3) r',[b,id(w),digest])).rows[0].r
 try{
  await db.query('insert into auth.users(id) values($1)',[id(1)])
  for(let n=2;n<6;n++)await db.query("insert into interview_attempts(id,user_id,format,station_id,station_title,recording_path,recording_mime_type,upload_status,recording_expires_at,transcript) values($1,$2,'mmi','test','test',$3,'audio/webm','ready',now()+interval '7 days','Keep this transcript')",[id(n),id(1),`test/${n}`])
  assert.equal(await claim(20),null)
  await db.exec('update interview_backup_health set enabled=true')
  const a=(await claim(20))!,b=(await claim(21))!
  assert.ok(a);assert.ok(b);assert.notEqual(a.id,b.id);assert.equal(await claim(22),null)
  assert.equal(await finish(a.id,21),false)
  await db.query("select finish_interview_backup($1,$2,'provider secret must not be saved')",[a.id,id(20)])
  const retry=(await db.query<{failures:number;last_error:string}>('select failures,last_error from interview_recording_backups where id=$1',[a.id])).rows[0]
  assert.equal(retry.failures,1);assert.equal(retry.last_error,'backup_operation_failed')
  await db.query('update interview_recording_backups set available_at=now() where id=$1',[a.id])
  assert.equal(await finish(b.id,21),true)
  // Finish all pending copies, including the retry.
  for(let i=0;i<5;i++){const job=await claim(22);if(!job)break;assert.equal(job.action,'copy');assert.equal(await finish(job.id,22),true)}
  await db.exec("alter table interview_attempts disable trigger interview_recording_expiry")
  await db.query("update interview_attempts set recording_expires_at=now()-interval '1 second',marking_status='awaiting_review' where id=$1",[id(2)])
  assert.equal(await claim(23),null)
  await db.query("update interview_attempts set marking_status='released' where id=$1",[id(2)])
  const expired=(await claim(23))!;assert.equal(expired.action,'delete');assert.equal(expired.attempt_id,id(2));await finish(expired.id,23)
  assert.equal((await db.query<{transcript:string}>('select transcript from interview_attempts where id=$1',[id(2)])).rows[0].transcript,'Keep this transcript')
  // A late object upload discovered after confirmed deletion is queued again.
  await db.query('select reconcile_interview_backup($1)',[id(2)])
  const late=(await claim(23))!;assert.equal(late.action,'delete');await finish(late.id,23)
  await db.query('delete from interview_attempts where id=$1',[id(3)])
  const removed=(await claim(23))!;assert.equal(removed.action,'delete');assert.equal(removed.attempt_id,null);await finish(removed.id,23)
  await db.query('select reconcile_interview_backup($1)',[id(99)])
  assert.equal((await claim(24))!.action,'delete')
  await db.exec('set role authenticated')
  await assert.rejects(db.query('select * from interview_recording_backups'),/permission denied/)
  await assert.rejects(claim(20),/permission denied/)
  await assert.rejects(db.query('select reconcile_interview_backup($1)',[id(99)]),/permission denied/)
 }finally{await db.close()}
})
test('backup monitor detects stalled runs and deletes, preserves an incident, then recovers',async()=>{
 const db=await fullDatabase()
 const check=async()=>(await db.query<{r:{issues:string[]}}>('select check_interview_operations() r')).rows[0].r
 try{
  assert.ok(!(await check()).issues.includes('recording_backups'))
  await db.exec("update interview_backup_health set enabled=true,last_success_at=now()-interval '20 minutes'")
  assert.ok((await check()).issues.includes('recording_backups'))
  await check()
  assert.equal((await db.query<{n:number}>("select count(*)::int n from interview_alert_deliveries where code='recording_backups' and kind='opened'")).rows[0].n,1)
  await db.exec('update interview_backup_health set last_success_at=now()')
  assert.ok(!(await check()).issues.includes('recording_backups'))
  await db.query("insert into interview_recording_backups(object_key,status,available_at) values($1,'delete',now()-interval '20 minutes')",['recordings/'+id(99)])
  assert.ok((await check()).issues.includes('recording_backups'))
 }finally{await db.close()}
})
const load=()=>loadModule('src/lib/interviews/recording-backups.ts',{'node:crypto':nodeCrypto,'node:stream':streams,'@aws-sdk/client-s3':{},'@/lib/supabase/admin':{}},{process:{env:{}}}) as {backupDigestStream:(n:number)=>{stream:streams.Transform;receipt:()=>{bytes:number;sha256:string}};runRecordingBackups:()=>Promise<{configured:boolean}>}
test('backup streams verify complete bytes and reject truncation, extra bytes and missing configuration',async()=>{
 const api=load(),body=Buffer.from('synthetic recording'),valid=api.backupDigestStream(body.length)
 await pipeline(streams.Readable.from([body]),valid.stream,new streams.Writable({write(_c,_e,cb){cb()}}))
 assert.equal(valid.receipt().sha256,nodeCrypto.createHash('sha256').update(body).digest('hex'))
 for(const expected of [body.length-1,body.length+1]){
  const broken=api.backupDigestStream(expected)
  await assert.rejects(pipeline(streams.Readable.from([body]),broken.stream,new streams.Writable({write(_c,_e,cb){cb()}})),/backup_size_mismatch/)
  assert.throws(()=>broken.receipt(),/backup_incomplete/)
 }
 assert.throws(()=>api.backupDigestStream(151*1024*1024),/invalid_backup_size/)
 assert.equal((await api.runRecordingBackups()).configured,false)
})
test('backup HTTP endpoint denies unauthorised requests and reports unavailable configuration',async()=>{
 let called=0,configured=false;
 const secret='x'.repeat(40);
 const route=loadModule('src/app/api/internal/interviews/backups/route.ts',{'@/lib/interviews/worker-auth':{validWorkerSecret:(header:string|null,key:string|undefined)=>!!key&&header===`Bearer ${key}`},'@/lib/interviews/recording-backups':{runRecordingBackups:async()=>{called++;return {configured,failed:0}}}},{process:{env:{CRON_SECRET:secret}}}) as {GET:(r:Request)=>Promise<Response>};
 const call=(token?:string)=>route.GET(new Request('https://example.invalid',{headers:token?{authorization:`Bearer ${token}`}:{}}));
 assert.equal((await call()).status,401);assert.equal((await call('wrong')).status,401);assert.equal(called,0);
 assert.equal((await call(secret)).status,503);configured=true;const result=await call(secret);assert.equal(result.status,200);assert.equal(result.headers.get('cache-control'),'private, no-store');
})
