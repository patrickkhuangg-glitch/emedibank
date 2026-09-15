import {test} from 'node:test'
import assert from 'node:assert/strict'
import {fullDatabase} from './helpers/full-database.mjs'

test('admin can classify a failed empty individual MMI before explicitly starting AI marking',async()=>{
 const db=await fullDatabase(),student='64000000-0000-4000-8000-000000000001',admin='64000000-0000-4000-8000-000000000002',attempt='64000000-0000-4000-8000-000000000003'
 const call=async<T=string>(sql:string,args:unknown[]=[]) => (await db.query<{r:T}>(`select ${sql} r`,args)).rows[0].r
 try{
  await db.exec(`insert into auth.users(id) values('${student}'),('${admin}');update profiles set role='admin' where id='${admin}';
   insert into interview_attempts(id,user_id,format,station_id,station_title,recording_path,recording_mime_type,media_kind,upload_status,marking_status,transcription_status,station_snapshot,questions)
    values('${attempt}','${student}','mmi','reflection','Reflection','sample/mmi-empty.webm','audio/webm','audio','ready','needs_attention','failed','{"format":"mmi","station_id":"reflection","questions":["What did you learn?"]}','["What did you learn?"]');
   insert into interview_markings(attempt_id,status) values('${attempt}','pending');
   insert into interview_processing_jobs(attempt_id,job_type,status,attempt_count) values('${attempt}','transcribe','dead',3);`)
  await assert.rejects(call('classify_mmi_response($1,$2,$3)',[attempt,student,'not_answered']))
  assert.equal(await call('classify_mmi_response($1,$2,$3)',[attempt,admin,'not_answered']),'saved')
  assert.equal(await call('classify_mmi_response($1,$2,$3)',[attempt,admin,'not_answered']),'already_saved')
  assert.equal(await call<string>('(select response_disposition from interview_attempts where id=$1)',[attempt]),'not_answered')
  assert.equal(await call<string>('(select status from interview_processing_jobs where attempt_id=$1 and job_type=\'transcribe\')',[attempt]),'succeeded')
  assert.equal(await call<number>("(select count(*)::int from interview_processing_jobs where attempt_id=$1 and job_type='assess')",[attempt]),0)
  assert.equal(await call('start_mmi_assessment($1,$2)',[attempt,admin]),'queued')
  assert.equal(await call<string>('(select marking_status from interview_attempts where id=$1)',[attempt]),'queued')
  assert.equal(await call<string>("(select status from interview_processing_jobs where attempt_id=$1 and job_type='assess')",[attempt]),'queued')
  assert.equal(await call('start_mmi_assessment($1,$2)',[attempt,admin]),'already_running')
  await db.exec(`update interview_attempts set marking_status='needs_attention' where id='${attempt}';update interview_processing_jobs set status='dead' where attempt_id='${attempt}' and job_type='assess';`)
  assert.equal(await call('retry_interview_job($1,\'assess\',$2)',[attempt,admin]),'queued')
  await db.exec(`update interview_attempts set marking_status='needs_attention' where id='${attempt}';update interview_processing_jobs set status='dead' where attempt_id='${attempt}' and job_type='assess';`)
  assert.equal(await call('retry_interview_job($1,\'transcribe\',$2)',[attempt,admin]),'queued')
  assert.equal(await call<string|null>('(select response_disposition from interview_attempts where id=$1)',[attempt]),null)
  assert.equal(await call<number>("(select count(*)::int from interview_marking_events where attempt_id=$1 and event_type='response_classification_cleared')",[attempt]),1)
 }finally{await db.close()}
})
