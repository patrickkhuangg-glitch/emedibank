import {test} from 'node:test'
import assert from 'node:assert/strict'
import {cleanupSchedulerCommand,retentionDispatchPredicate} from '../scripts/lib/interview-cleanup-scheduler.mjs'
import {fullDatabase} from './helpers/full-database.mjs'
test('cleanup dispatcher reuses private credentials and targets expiry independently of AI work',async()=>{
 const original=`select net.http_post(url := 'https://example.invalid/api/internal/interviews/process',headers := private_header_expression())
 where (exists (select 1 from public.interview_processing_jobs where status='queued') or exists (select 1 from public.interview_mock_processing_jobs where status='queued'))
    and exists (select 1 from vault.decrypted_secrets where name='worker');`
 const updated=cleanupSchedulerCommand(original)
 assert.ok(updated.includes('/api/internal/interviews/cleanup'));assert.ok(updated.includes('headers := private_header_expression()'))
 assert.ok(updated.endsWith("and exists (select 1 from vault.decrypted_secrets where name='worker');"))
 assert.throws(()=>cleanupSchedulerCommand(updated))
 const db=await fullDatabase()
 try{
  assert.equal((await db.query<{due:boolean}>(`select ${retentionDispatchPredicate} due`)).rows[0].due,false)
  const owner='90000000-0000-4000-8000-000000000001'
  await db.query('insert into auth.users(id) values($1)',[owner])
  await db.query("insert into interview_attempts(user_id,format,station_id,station_title,recording_path,recording_mime_type,media_kind,upload_status,duration_seconds) values($1,'mmi','test','test','fixture','audio/webm','audio','ready',60)",[owner])
  await db.exec("alter table interview_attempts disable trigger interview_recording_expiry;update interview_attempts set recording_expires_at=now()-interval '1 second';alter table interview_attempts enable trigger interview_recording_expiry")
  assert.equal((await db.query<{due:boolean}>(`select ${retentionDispatchPredicate} due`)).rows[0].due,true)
  await db.query('select enqueue_interview_retention(7)')
  assert.equal((await db.query<{due:boolean}>(`select ${retentionDispatchPredicate} due`)).rows[0].due,true)
 }finally{await db.close()}
})
