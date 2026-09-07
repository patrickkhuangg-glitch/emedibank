import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {PGlite} from '@electric-sql/pglite'

test('private layout cache fences parallel/stale results, caps retries and preserves transcripts',async()=>{
 const db=new PGlite()
 try{
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
   create table public.interview_attempts(id uuid primary key,user_id uuid,upload_status text,transcription_status text,transcript text,questions jsonb);
   grant usage on schema public to anon,authenticated,service_role;`)
  await db.exec(readFileSync('supabase/migrations/0043_interview_transcript_layouts.sql','utf8'))
  const id='10000000-0000-4000-8000-000000000001',owner='20000000-0000-4000-8000-000000000001',other='20000000-0000-4000-8000-000000000002',token='30000000-0000-4000-8000-000000000001',next='30000000-0000-4000-8000-000000000002'
  await db.query("insert into interview_attempts values($1,$2,'ready','ready','Original transcript.', '[\"Question one?\",\"Question two?\"]')",[id,owner])
  const claim=async(user=owner,request=token)=>(await db.query<{value:{status:string}}>('select claim_interview_transcript_layout($1,$2,$3) value',[id,user,request])).rows[0].value
  const complete=async(request=token,layout:unknown={version:1,spans:[{start:0,end:20,questionIndex:0}]})=>(await db.query<{ok:boolean}>('select complete_interview_transcript_layout($1,$2,$3,$4,$5) ok',[id,owner,request,layout===null?null:JSON.stringify(layout),'test'])).rows[0].ok
  assert.equal((await claim(other)).status,'unavailable')
  assert.equal((await claim()).status,'claimed');assert.equal((await claim(owner,next)).status,'processing')
  assert.equal(await complete(next),false);assert.equal(await complete(),true)
  assert.equal((await claim()).status,'ready')
  assert.equal((await db.query<{transcript:string}>('select transcript from interview_attempts')).rows[0].transcript,'Original transcript.')
  await db.exec("update interview_attempts set transcript='Changed transcript.'")
  assert.equal((await claim()).status,'claimed')
  await db.exec("update interview_attempts set transcript='Changed again.'")
  assert.equal(await complete(),false)
  assert.equal((await claim()).status,'claimed');assert.equal(await complete(token,null),true)
  assert.equal((await claim()).status,'processing')
  for(let i=0;i<2;i++){
   await db.exec("update interview_transcript_layouts set started_at=now()-interval '2 minutes'")
   assert.equal((await claim()).status,'claimed');assert.equal(await complete(token,null),true)
  }
  await db.exec("update interview_transcript_layouts set started_at=now()-interval '2 minutes'")
  assert.equal((await claim()).status,'unavailable')
  await db.exec('set role authenticated')
  await assert.rejects(db.exec('select * from interview_transcript_layouts'),/permission denied/)
  await assert.rejects(claim(),/permission denied/)
  await db.exec('reset role; delete from interview_attempts')
  assert.equal((await db.query('select * from interview_transcript_layouts')).rows.length,0)
 }finally{await db.close()}
})
