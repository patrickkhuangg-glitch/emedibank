import {test} from 'node:test'
import assert from 'node:assert/strict'
import {fullDatabase} from './helpers/full-database.mjs'
import {recordingAvailable,recordingExpired,recordingUrlLifetime} from '../src/lib/interviews/recording-retention'
const owner='80000000-0000-4000-8000-000000000001',other='80000000-0000-4000-8000-000000000002'
const id=(i:number)=>`81000000-0000-4000-8000-${String(i).padStart(12,'0')}`
test('audio/video expire together, pending marking survives, expiry cannot be extended, cleanup preserves transcripts, and owner deletion cascades',async()=>{
 const db=await fullDatabase()
 try{
  await db.query('insert into auth.users(id) values($1)',[owner])
  for(let i=0;i<4;i++)await db.query(`insert into interview_attempts(id,user_id,format,station_id,station_title,recording_path,recording_mime_type,media_kind,upload_status,duration_seconds,transcript,transcription_status) values($1,$2,'mmi','test','Retention fixture',$3,$4,$5,'ready',60,'This transcript must remain available.','ready')`,[id(i),owner,`${owner}/${id(i)}/response.webm`,i%2?'video/webm':'audio/webm',i%2?'video':'audio'])
  const deadline=(await db.query<{recording_expires_at:string}>('select recording_expires_at from interview_attempts where id=$1',[id(0)])).rows[0].recording_expires_at
  await db.query("update interview_attempts set recording_expires_at=now()+interval '100 days' where id=$1",[id(0)])
  assert.deepEqual((await db.query<{recording_expires_at:string}>('select recording_expires_at from interview_attempts where id=$1',[id(0)])).rows[0].recording_expires_at,deadline)
  await db.query("update interview_attempts set marking_status='awaiting_review' where id=$1",[id(2)])
  await db.query('update interview_attempts set duration_seconds=0 where id=$1',[id(0)])
  // Advance fixture deadlines without bypassing the production policy in the test itself.
  await db.exec("alter table interview_attempts disable trigger interview_recording_expiry;update interview_attempts set recording_expires_at=now()-interval '1 second';alter table interview_attempts enable trigger interview_recording_expiry")
  await assert.rejects(db.query("update interview_attempts set marking_status='queued' where id=$1",[id(0)]),/recording_expired/)
  for(let i=0;i<4;i++)await db.query("insert into storage.objects(bucket_id,name) values('interview-recordings',$1)",[`${owner}/${id(i)}/response.webm`])
  await db.exec(`set role authenticated;set request.jwt.claim.sub='${owner}'`)
  assert.equal((await db.query<{n:number}>("select count(*)::int n from storage.objects where bucket_id='interview-recordings'")).rows[0].n,1)
  assert.equal((await db.query<{n:number}>('select count(*)::int n from interview_attempts where transcript is not null')).rows[0].n,4)
  await db.exec('reset role')
  assert.equal((await db.query<{n:number}>('select enqueue_interview_retention(90) n')).rows[0].n,3)
  assert.equal((await db.query<{upload_status:string}>('select upload_status from interview_attempts where id=$1',[id(2)])).rows[0].upload_status,'ready')
  // Provider admission does not consume cleanup jobs. Cleanup gets its own lanes.
  assert.equal((await db.query<{r:unknown}>("select claim_fair_interview_job('normal') r")).rows[0].r,null)
  const claimed=(await db.query<{r:{job:{id:string;attempt_id:string}}}>("select claim_fair_interview_job('cleanup',true) r")).rows[0].r
  assert.ok(claimed)
  await db.query("select complete_interview_job($1,'cleanup','{}')",[claimed.job.id])
  const row=(await db.query<{transcript:string;video_deleted_at:string}>('select transcript,video_deleted_at from interview_attempts where id=$1',[claimed.job.attempt_id])).rows[0]
  assert.equal(row.transcript,'This transcript must remain available.');assert.ok(row.video_deleted_at)
  await db.query("update interview_attempts set marking_status='released',released_at=now() where id=$1",[id(2)])
  assert.equal((await db.query<{n:number}>('select enqueue_interview_retention(7) n')).rows[0].n,1)
  await db.query('delete from auth.users where id=$1',[owner])
  assert.equal((await db.query<{n:number}>('select count(*)::int n from interview_attempts')).rows[0].n,0)
 }finally{await db.close()}
})
test('shared worker admission bounds both queues, takes fair student turns, respects backoff and fences stale workers',async()=>{
 const db=await fullDatabase()
 type Claim={queue:string;job:{id:string;attempt_id?:string;marking_id?:string;locked_by:string}}
 const claim=async(worker:string)=>(await db.query<{r:Claim|null}>('select claim_fair_interview_job($1) r',[worker])).rows[0].r
 try{
  await db.query('insert into auth.users(id) values($1),($2)',[owner,other])
  for(let i=0;i<8;i++){
   await db.query(`insert into interview_attempts(id,user_id,format,station_id,station_title,recording_path,recording_mime_type,media_kind,upload_status,duration_seconds) values($1,$2,'mmi','test','Queue fixture',$3,'audio/webm','audio','ready',60)`,[id(i),i<4?owner:other,`${i<4?owner:other}/${id(i)}/response.webm`])
   await db.query("insert into interview_processing_jobs(attempt_id,job_type,available_at) values($1,'transcribe',now()-interval '1 hour')",[id(i)])
  }
  const first=await claim('one'),second=await claim('two')
  assert.ok(first?.job.attempt_id);assert.ok(second?.job.attempt_id)
  assert.equal(Number(first.job.attempt_id.slice(-1))<4,true);assert.equal(Number(second.job.attempt_id.slice(-1))>=4,true)
  // Occupy a slot with a session-level job as well: bound is across tables.
  await db.query("insert into interview_mock_markings(id,mock_session_id,user_id,status,credits_spent) values($1,$2,$3,'queued',12)",[id(30),id(31),owner])
  await db.query("insert into interview_mock_processing_jobs(marking_id,job_type,available_at) values($1,'assess',now()-interval '2 hours')",[id(30)])
  const third=await claim('three');assert.equal(third?.queue,'panel')
  const fourth=await claim('four');assert.ok(fourth)
  assert.equal(await claim('five'),null)
  // Concurrent callers are simulated through independent SQL operations in PGlite;
  // real multi-connection lock contention is a separate staging check.
  const blocked=await Promise.all(Array.from({length:20},(_,i)=>claim(`extra-${i}`)))
  assert.ok(blocked.every(c=>c===null))
  await db.query("select fail_interview_job($1,'one','provider_http_429',3600)",[first.job.id])
  const next=await claim('next');assert.ok(next);assert.notEqual(next.job.id,first.job.id)
  assert.equal((await db.query<{r:boolean}>("select complete_interview_job($1,'one','{\"text\":\"A stale result must be ignored.\"}') r",[first.job.id])).rows[0].r,false)
  await db.query("update interview_processing_jobs set locked_at=now()-interval '11 minutes' where id=$1",[next.job.id])
  const recovered=await claim('recovered');assert.ok(recovered)
  await db.exec('set role authenticated')
  await assert.rejects(db.query("select claim_fair_interview_job('intruder')"),/permission denied/)
 }finally{await db.close()}
})
test('dated download access stops at expiry; unfinished marking remains playable',()=>{
 const now=Date.parse('2026-09-08T00:00:00Z'),a={recording_expires_at:'2026-09-08T00:00:30Z',upload_status:'ready',marking_status:null,video_deleted_at:null}
 assert.equal(recordingUrlLifetime(a,now),30)
 assert.equal(recordingAvailable(a,now),true)
 assert.equal(recordingExpired(a,now+30000),true)
 assert.equal(recordingAvailable({...a,marking_status:'awaiting_review'},now+30000),true)
 assert.equal(recordingAvailable({...a,marking_status:'released'},now+30000),false)
 assert.equal(recordingAvailable({...a,video_deleted_at:'2026-09-01'},now),false)
})
