import {test} from 'node:test'
import assert from 'node:assert/strict'
import {fullDatabase} from './helpers/full-database.mjs'
import {panelAdmin as admin,panelMembers,panelOwner as owner,panelSession as session} from './helpers/panel-fixture'

test('admin can classify failed empty panel responses before explicitly starting AI marking',async()=>{
 const db=await fullDatabase(),members=panelMembers()
 const call=async<T=string>(sql:string,args:unknown[]=[]) => (await db.query<{r:T}>(`select ${sql} r`,args)).rows[0].r
 try{
  await db.exec(`insert into auth.users(id) values('${owner}'),('${admin}');update profiles set mmi_credits=30 where id='${owner}';update profiles set role='admin' where id='${admin}';`)
  for(const [index,m] of members.entries()){
   const text=index<8?m.transcript:null,status=index<8?'ready':'failed'
   await db.query(`insert into interview_attempts(id,user_id,format,station_id,station_title,recording_path,recording_mime_type,media_kind,upload_status,marking_preflight_at,station_snapshot,questions,duration_seconds,transcript,transcription_status) values($1,$2,'panel','test',$3,$4,'video/webm','video','ready',now(),$5::jsonb,$6::jsonb,120,$7,$8)`,[m.id,owner,m.station_title,`${owner}/${m.id}/response.webm`,JSON.stringify(m.station_snapshot),JSON.stringify(m.questions),text,status])
   await db.query("insert into storage.objects(bucket_id,name) values('interview-recordings',$1)",[`${owner}/${m.id}/response.webm`])
  }
  assert.equal((await call<{status:string}>('submit_whole_panel_for_marking($1,$2,12,10)',[session,owner])).status,'submitted')
  const markingId=await call<string>('(select id from interview_mock_markings)')
  await db.exec("update interview_processing_jobs set status='dead',attempt_count=max_attempts where job_type='transcribe'")
  await assert.rejects(call('classify_panel_response($1,$2,$3,$4)',[markingId,members[8].id,owner,'insubstantial']))
  assert.equal(await call('classify_panel_response($1,$2,$3,$4)',[markingId,members[8].id,admin,'insubstantial']),'saved')
  assert.equal(await call('classify_panel_response($1,$2,$3,$4)',[markingId,members[8].id,admin,'insubstantial']),'already_saved')
  assert.equal(await call<boolean>('panel_members_ready($1)',[markingId]),false)
  assert.equal(await call('classify_panel_response($1,$2,$3,$4)',[markingId,members[9].id,admin,'not_answered']),'saved')
  assert.equal(await call<boolean>('panel_members_ready($1)',[markingId]),true)
  assert.equal(await call<number>("(select count(*)::int from interview_processing_jobs where job_type='transcribe' and status='succeeded')"),2)
  assert.equal(await call<number>('(select count(*)::int from interview_mock_processing_jobs)'),0)
  assert.equal(await call<number>("(select count(*)::int from interview_mock_marking_events where event_type='response_classified')"),2)
  assert.equal(await call('retry_panel_job($1,$2,\'assess\')',[markingId,admin]),'queued')
  assert.equal(await call<number>("(select count(*)::int from interview_mock_processing_jobs where job_type='assess' and status='queued')"),1)
  assert.equal(await call('classify_panel_response($1,$2,$3,$4)',[markingId,members[8].id,admin,'not_answered']),'not_eligible')
 }finally{await db.close()}
})
