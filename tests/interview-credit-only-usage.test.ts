import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {fullDatabase} from './helpers/full-database.mjs'
import {validateMedia,VIDEO_LIMIT,AUDIO_LIMIT} from '../src/lib/interviews/media-validation'

test('free practice ignores former daily/storage caps, meters transcription, and leaves marking credits and privacy intact',async()=>{
 const db=await fullDatabase(),owner='60000000-0000-4000-8000-000000000001'
 try{
  await db.query('insert into auth.users(id) values($1)',[owner])
  await db.query('update profiles set mmi_credits=0 where id=$1',[owner])
  const limits=(await db.query<Record<string,unknown>>('select * from interview_security_limits')).rows[0]
  for(const key of ['recording_daily_limit','recording_storage_bytes','transcription_daily_limit','transcription_global_daily_limit'])assert.equal(limits[key],null)
  // Metadata only: a saved library larger than the old 2 GiB allowance.
  await db.query("insert into storage.objects(bucket_id,name,metadata) values('interview-recordings',$1,'{\"size\":3221225472}')",[`${owner}/synthetic-existing-library`])
  const ids:string[]=[]
  for(let i=0;i<35;i++){
   const id=`70000000-0000-4000-8000-${String(i).padStart(12,'0')}`;ids.push(id)
   await db.query(`insert into interview_attempts(id,user_id,format,station_id,station_title,recording_path,recording_mime_type,media_kind,upload_status,station_snapshot) values($1,$2,'mmi','mmi-confidentiality-patient-safety','Synthetic cap regression',$3,'video/webm','video','awaiting_upload','{}')`,[id,owner,`${owner}/${id}/response.webm`])
  }
  for(let i=0;i<505;i++)assert.equal((await db.query<{allowed:boolean}>('select consume_interview_transcription($1) allowed',[owner])).rows[0].allowed,true)
  assert.equal((await db.query<{n:number}>("select count(*)::int n from interview_resource_usage where resource='transcription'")).rows[0].n,505)
  assert.equal((await db.query<{n:number}>('select mmi_credits n from profiles where id=$1',[owner])).rows[0].n,0)
  assert.equal((await db.query<{allowed:boolean}>('select consume_interview_transcription(null) allowed')).rows[0].allowed,false)
  await db.query("update interview_attempts set upload_status='ready',marking_preflight_at=now() where id=$1",[ids[0]])
  await db.query("insert into storage.objects(bucket_id,name,metadata) values('interview-recordings',$1,'{\"size\":1000}')",[`${owner}/${ids[0]}/response.webm`])
  await db.exec(`set request.jwt.claim.sub='${owner}'`)
  assert.equal((await db.query<{status:string}>('select submit_interview_for_marking($1,2) status',[ids[0]])).rows[0].status,'no_credits')
  await db.exec('set role authenticated')
  await assert.rejects(db.exec('update interview_security_limits set transcription_daily_limit=null'),/permission denied/)
  await assert.rejects(db.query('select consume_interview_transcription($1)',[owner]),/permission denied/)
  await db.exec('reset role')
  // Explicit positive limits remain available for an operator rollback.
  await db.exec('update interview_security_limits set transcription_daily_limit=20')
  assert.equal((await db.query<{allowed:boolean}>('select consume_interview_transcription($1) allowed',[owner])).rows[0].allowed,false)
  await db.exec('update interview_security_limits set transcription_daily_limit=null,transcription_global_daily_limit=500')
  assert.equal((await db.query<{allowed:boolean}>('select consume_interview_transcription($1) allowed',[owner])).rows[0].allowed,false)
  await db.exec('update interview_security_limits set recording_daily_limit=10')
  await assert.rejects(db.query(`insert into interview_attempts(user_id,format,station_id,station_title,recording_path,recording_mime_type,media_kind) values($1,'mmi','test','test',$2,'video/webm','video')`,[owner,`${owner}/cap-rollback`]),/recording_daily_limit/)
  await db.exec('update interview_security_limits set recording_daily_limit=null,recording_storage_bytes=2147483648')
  await assert.rejects(db.query(`insert into interview_attempts(user_id,format,station_id,station_title,recording_path,recording_mime_type,media_kind) values($1,'mmi','test','test',$2,'video/webm','video')`,[owner,`${owner}/storage-rollback`]),/recording_storage_limit/)
 }finally{await db.close()}
})
test('unrestricted practice does not remove supported media sizes or formats',()=>{
 assert.doesNotThrow(()=>validateMedia('audio/webm',1000,'audio'))
 assert.throws(()=>validateMedia('audio/webm',AUDIO_LIMIT+1,'audio'))
 assert.throws(()=>validateMedia('video/webm',VIDEO_LIMIT+1,'video'))
 assert.throws(()=>validateMedia('application/octet-stream',1000,'video'))
})

test('removing caps wakes quota-delayed transcripts without resetting provider retries or active leases',async()=>{
 const db=await fullDatabase(),owner='60000000-0000-4000-8000-000000000002'
 try{
  await db.query('insert into auth.users(id) values($1)',[owner])
  for(const [index,status,code] of [[1,'queued','transcription_quota'],[2,'failed','provider_timeout'],[3,'running','transcription_quota']] as const){
   const id=`71000000-0000-4000-8000-${String(index).padStart(12,'0')}`
   await db.query("insert into interview_attempts(id,user_id,format,station_id,station_title,recording_path,recording_mime_type,media_kind) values($1,$2,'mmi','test','test',$3,'video/webm','video')",[id,owner,`${owner}/${id}/video.webm`])
   await db.query("insert into interview_processing_jobs(attempt_id,job_type,status,available_at,last_error_code,attempt_count,locked_by,locked_at) values($1,'transcribe',$2,now()+interval '1 hour',$3,2,'synthetic-worker',now())",[id,status,code])
  }
  await db.exec(readFileSync('supabase/migrations/0049_interview_credit_only_usage.sql','utf8'))
  const rows=(await db.query<{status:string;due:boolean;last_error_code:string|null;attempt_count:number;locked_by:string}>("select status,available_at<=now() as due,last_error_code,attempt_count,locked_by from interview_processing_jobs order by attempt_id")).rows
  assert.equal(rows[0].due,true);assert.equal(rows[0].last_error_code,null)
  assert.equal(rows[1].due,false);assert.equal(rows[1].last_error_code,'provider_timeout')
  assert.equal(rows[2].due,false);assert.equal(rows[2].status,'running')
  assert.ok(rows.every(r=>r.attempt_count===2&&r.locked_by==='synthetic-worker'))
 }finally{await db.close()}
})
