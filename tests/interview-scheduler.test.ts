import {test} from 'node:test'
import assert from 'node:assert/strict'
import {PGlite} from '@electric-sql/pglite'
import {patchInterviewScheduler,schedulerQueuePredicate} from '../scripts/lib/interview-scheduler.mjs'
const original=`select net.http_post(url := 'https://example.invalid/worker', headers := '{}'::jsonb, timeout_milliseconds := 120000)
    where exists (
      select 1 from public.interview_processing_jobs
      where (status in ('queued','failed') and available_at <= now())
         or (status = 'running' and locked_at < now() - interval '10 minutes')
    )
    and exists (select 1 from vault.decrypted_secrets where name='fixture' and length(decrypted_secret)>=32);`
test('scheduler patch preserves HTTP and secret guard, refuses unexpected and repeated changes',()=>{
 const patched=patchInterviewScheduler(original)
 assert.equal(patched.split('where (exists')[0],original.split('where exists')[0])
 assert.equal(patched.split('\n    and exists')[1],original.split('\n    and exists')[1])
 assert.throws(()=>patchInterviewScheduler(patched),/already present/)
 assert.throws(()=>patchInterviewScheduler(original.replace('10 minutes','20 minutes')),/Unexpected/)
})
test('panel-only assessment/audit, retries and expired leases wake scheduler; empty/future/finished work does not',async()=>{
 const db=new PGlite(),predicate=schedulerQueuePredicate(patchInterviewScheduler(original))
 try{
 await db.exec(`create table interview_processing_jobs(status text,available_at timestamptz,locked_at timestamptz,job_type text);create table interview_mock_processing_jobs(like interview_processing_jobs);`)
 const ready=async()=> (await db.query<{ready:boolean}>(`select ${predicate} as ready`)).rows[0].ready
 assert.equal(await ready(),false)
 for(const stage of ['assess','audit'])for(const [status,available,locked,expected] of [
  ['queued','-1 minute',null,true],['failed','-1 minute',null,true],['failed','1 hour',null,false],
  ['running','-1 minute','-11 minutes',true],['running','-1 minute','-1 minute',false],
  ['succeeded','-1 minute',null,false],['dead','-1 minute',null,false],
 ] as const){
  await db.exec('truncate interview_mock_processing_jobs')
  await db.query(`insert into interview_mock_processing_jobs values($1,now()+$2::interval,case when $3::text is null then null else now()+$3::interval end,$4)`,[status,available,locked,stage])
  assert.equal(await ready(),expected,`${stage} ${status} ${available} ${locked}`)
 }
 await db.exec(`truncate interview_mock_processing_jobs;insert into interview_processing_jobs values('queued',now(),null,'transcribe')`)
 assert.equal(await ready(),true)
 }finally{await db.close()}
})
