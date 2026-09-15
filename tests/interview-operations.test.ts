import {test} from 'node:test'
import assert from 'node:assert/strict'
import {fullDatabase} from './helpers/full-database.mjs'
import {loadModule} from './helpers/load-module.mjs'
test('background monitoring detects stalls/overdue cleanup, records incidents once, resolves them, and stays private',async()=>{
 const db=await fullDatabase(),user='91000000-0000-4000-8000-000000000001'
 const check=async()=>(await db.query<{r:{issues:string[];metrics:Record<string,unknown>}}>('select check_interview_operations() r')).rows[0].r
 try{
  assert.deepEqual((await check()).issues,[])
  await db.query('insert into auth.users(id) values($1)',[user])
  const a=(await db.query<{id:string}>("insert into interview_attempts(user_id,format,station_id,station_title,recording_path,recording_mime_type,media_kind,upload_status,duration_seconds) values($1,'mmi','test','test','fixture','audio/webm','audio','ready',60) returning id",[user])).rows[0].id
  await db.query("insert into interview_processing_jobs(attempt_id,job_type,available_at) values($1,'transcribe',now()-interval '20 minutes')",[a])
  assert.ok((await check()).issues.includes('processing_stalled'));assert.ok((await check()).issues.includes('queue_delay'))
  assert.equal((await db.query<{n:number}>("select count(*)::int n from interview_operation_incidents where code='queue_delay'")).rows[0].n,1)
  await db.exec("alter table interview_attempts disable trigger interview_recording_expiry;update interview_attempts set recording_expires_at=now()-interval '1 hour';alter table interview_attempts enable trigger interview_recording_expiry")
  assert.ok((await check()).issues.includes('cleanup_overdue'))
  await db.query("select record_interview_operation('92000000-0000-4000-8000-000000000001','processing','failed',0)")
  assert.ok((await check()).issues.includes('operation_failed'))
  await db.exec("delete from interview_processing_jobs;update interview_attempts set video_deleted_at=now();delete from interview_operation_runs")
  assert.deepEqual((await check()).issues,[])
  assert.ok((await db.query<{n:number}>("select count(*)::int n from interview_operation_incidents where resolved_at is not null")).rows[0].n>=3)
  await db.exec('set role authenticated')
  for(const call of ['check_interview_operations()','read_interview_operations()',"record_interview_operation('92000000-0000-4000-8000-000000000002','cleanup')"])await assert.rejects(db.exec(`select ${call}`),/permission denied/)
  await assert.rejects(db.exec('select * from interview_operation_health'),/permission denied/)
 }finally{await db.close()}
})
test('health endpoint denies students and fails visibly rather than claiming healthy when monitor is unavailable',async()=>{
 let role='student',data:unknown=null
 const route=loadModule('src/app/api/admin/interviews/health/route.ts',{'@/lib/interviews/operation-alerts':{alertConfiguration:()=>null},'@/lib/auth/dal':{getProfile:async()=>({role})},'@/lib/supabase/admin':{createAdminClient:()=>({rpc:async()=>({data,error:null})})}}) as {GET:()=>Promise<Response>}
 assert.equal((await route.GET()).status,403);role='admin';assert.equal((await route.GET()).status,503)
 data={issues:[],metrics:{},checked_at:new Date().toISOString()};const r=await route.GET();assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'private, no-store')
})
