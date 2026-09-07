import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'

test('practice audio exceeds ten recordings without spending mock allowance; storage and transcription limits still apply', async () => {
 const db=new PGlite()
 try {
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;
  create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  create table profiles(id uuid primary key references auth.users,role text,mmi_credits integer default 0);
  create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
  create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,metadata jsonb);alter table storage.objects enable row level security;
  create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;
  grant usage on schema public,auth,storage to anon,authenticated,service_role;grant all on all tables in schema public,storage to authenticated,service_role;`)
  for(const file of ['0021_interview_recordings.sql','0023_interview_transcripts.sql','0033_interview_video_marking.sql','0035_security_hardening.sql','0042_practice_audio_recording_limit.sql'])await db.exec(readFileSync(`supabase/migrations/${file}`,'utf8'))
  const owner='00000000-0000-4000-8000-000000000001'
  await db.query('insert into auth.users values($1)',[owner]);await db.query("insert into profiles values($1,'student',20)",[owner])
  async function recording(index:number,kind='audio',source:string|null='practice_audio'){
   const id=`10000000-0000-4000-8000-${String(index).padStart(12,'0')}`,path=`${owner}/${id}/response.webm`
   await db.query(`insert into interview_attempts(id,user_id,format,station_id,station_title,recording_path,recording_mime_type,media_kind,upload_status,station_snapshot) values($1,$2,'panel','panel-motivation','Test',$3,$4,$5,'awaiting_upload',$6)`,[id,owner,path,`${kind}/webm`,kind,JSON.stringify(source?{source}:{})])
   await db.query("insert into storage.objects(bucket_id,name,metadata) values('interview-recordings',$1,$2)",[path,JSON.stringify({size:1000})])
   await db.query("update interview_attempts set upload_status='ready' where id=$1",[id])
  }
  for(let i=0;i<25;i++)await recording(i)
  assert.equal((await db.query('select * from interview_attempts')).rows.length,25)
  assert.equal((await db.query("select * from interview_resource_usage where resource='recording'")).rows.length,0)
  for(let i=25;i<35;i++)await recording(i,'video',null)
  await assert.rejects(recording(35,'video',null),/recording_daily_limit/)
  await assert.rejects(recording(36,'video','practice_audio'),/recording_daily_limit/)
  await assert.rejects(recording(37,'audio',null),/recording_daily_limit/)
  await recording(38)
  for(let i=0;i<20;i++)assert.equal((await db.query<{ok:boolean}>('select consume_interview_transcription($1) ok',[owner])).rows[0].ok,true)
  assert.equal((await db.query<{ok:boolean}>('select consume_interview_transcription($1) ok',[owner])).rows[0].ok,false)
  await db.exec('update interview_security_limits set recording_storage_bytes=1')
  await assert.rejects(recording(39),/recording_storage_limit/)
  assert.equal((await db.query<{mmi_credits:number}>('select mmi_credits from profiles')).rows[0].mmi_credits,20)
  await db.exec('set role authenticated')
  await assert.rejects(db.exec('update interview_security_limits set recording_storage_bytes=999999999'),/permission denied/)
 } finally { await db.close() }
})
