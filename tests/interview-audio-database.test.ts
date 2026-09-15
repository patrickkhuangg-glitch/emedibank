import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'

test('audio finalisation creates one transcription job and one calendar entry without spending marking credits', async () => {
 const db = new PGlite()
 try {
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;
  create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  create table profiles(id uuid primary key references auth.users,role text,mmi_credits integer default 0);
  create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
  create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;
  create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;
  grant usage on schema public,auth,storage to anon,authenticated,service_role;grant all on all tables in schema public,storage to authenticated,service_role;`)
  for (const file of ['0021_interview_recordings.sql','0023_interview_transcripts.sql','0033_interview_video_marking.sql','0041_interview_practice_progress.sql']) await db.exec(readFileSync(`supabase/migrations/${file}`,'utf8'))
  const user='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002',id='10000000-0000-4000-8000-000000000001'
  await db.exec(`insert into auth.users values('${user}'),('${other}');insert into profiles values('${user}','student',20),('${other}','student',0);
   insert into interview_attempts(id,user_id,format,station_id,station_title,recording_path,recording_mime_type,media_kind,upload_status) values('${id}','${user}','panel','panel-motivation','Practice audio','${user}/${id}/practice.webm','audio/webm','audio','awaiting_upload');`)
  assert.equal((await db.query('select * from interview_practice_logs')).rows.length,0)
  const finalise=()=>db.query('select finalise_interview_upload($1,$2,30,$3,true)',[id,user,JSON.stringify([{question_index:0,offset_seconds:0}])])
  await finalise();await finalise()
  assert.equal((await db.query('select * from interview_practice_logs')).rows.length,1)
  const jobs=await db.query<{id:string;job_type:string}>('select id,job_type from interview_processing_jobs')
  assert.equal(jobs.rows.length,1);assert.equal(jobs.rows[0].job_type,'transcribe')
  const claimed=await db.query<{id:string}>("select * from claim_next_interview_job('audio-worker')")
  assert.equal(claimed.rows[0].id,jobs.rows[0].id)
  await db.query("select complete_interview_job($1,'audio-worker',$2)",[jobs.rows[0].id,JSON.stringify({text:'This is a private practice transcript.',model:'test'})])
  const saved=await db.query<{transcription_status:string;transcript:string;credits_spent:number;marking_status:null}>('select transcription_status,transcript,credits_spent,marking_status from interview_attempts')
  assert.equal(saved.rows[0].transcription_status,'ready');assert.equal(saved.rows[0].transcript,'This is a private practice transcript.')
  assert.equal(saved.rows[0].credits_spent,0);assert.equal(saved.rows[0].marking_status,null)
  assert.equal((await db.query<{mmi_credits:number}>('select mmi_credits from profiles where id=$1',[user])).rows[0].mmi_credits,20)
  assert.equal((await db.query('select * from interview_markings')).rows.length,0)
  assert.equal((await db.query("select * from interview_processing_jobs where job_type!='transcribe'")).rows.length,0)
  await db.exec(`grant select on interview_attempts to authenticated;set role authenticated;set request.jwt.claim.sub='${other}';`)
  assert.equal((await db.query('select transcript from interview_attempts')).rows.length,0)
  assert.equal((await db.query('select * from interview_practice_logs')).rows.length,0)
 } finally { await db.close() }
})
