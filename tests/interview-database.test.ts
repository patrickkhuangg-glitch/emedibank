import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'

test('migration, RLS, immutable storage, atomic credits, leases, refunds and release', async () => {
 const db = new PGlite()
 await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth; create schema storage;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 create table public.profiles(id uuid primary key references auth.users, role text, mmi_credits integer default 0);
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;
 create function storage.foldername(text) returns text[] language sql as $$ select string_to_array($1,'/') $$;
 grant usage on schema public,auth,storage to anon,authenticated,service_role;
 grant all on all tables in schema public,storage to authenticated,service_role;
 `)
 for (const name of ['0021_interview_recordings.sql','0023_interview_transcripts.sql','0033_interview_video_marking.sql']) await db.exec(readFileSync(`supabase/migrations/${name}`,'utf8'))
 await db.exec('grant select on public.interview_attempts to authenticated; grant all on public.interview_attempts to service_role;')
 const a='00000000-0000-4000-8000-000000000001', b='00000000-0000-4000-8000-000000000002', admin='00000000-0000-4000-8000-000000000003', attempt='10000000-0000-4000-8000-000000000001'
 await db.exec(`insert into auth.users values ('${a}'),('${b}'),('${admin}'); insert into profiles values ('${a}','student',2),('${b}','student',0),('${admin}','admin',0);
 insert into interview_attempts(id,user_id,format,station_id,station_title,recording_path,recording_mime_type) values('${attempt}','${a}','mmi','station','Station','${a}/${attempt}/response.webm','video/webm');
 insert into storage.objects(bucket_id,name) values('interview-recordings','${a}/${attempt}/response.webm');`)
 async function asStudent(id:string) { await db.exec(`reset role; set role authenticated; set request.jwt.claim.sub='${id}';`) }
 await asStudent(b)
 assert.equal((await db.query('select * from interview_attempts')).rows.length,0)
 assert.equal((await db.query('select * from storage.objects')).rows.length,0)
 for(const table of ['interview_markings','interview_processing_jobs','interview_marking_events']) await assert.rejects(db.query(`select * from ${table}`))
 await assert.rejects(db.query(`select * from claim_next_interview_job('attacker')`))
 await asStudent(a)
 assert.equal((await db.query('select * from interview_attempts')).rows.length,1)
 await assert.rejects(db.query(`update interview_attempts set marking_status='released'`))
 await assert.rejects(db.query(`update profiles set mmi_credits=99 where id='${a}'`))
 await assert.rejects(db.query(`insert into storage.objects(bucket_id,name) values('interview-recordings','${b}/rogue.webm')`))
 await assert.rejects(db.query(`insert into storage.objects(bucket_id,name) values('interview-recordings','${a}/rogue.webm')`))
 assert.equal((await db.query<{result:string}>(`select submit_interview_for_marking('${attempt}') result`)).rows[0].result,'not_ready')
 await db.exec(`reset role; update interview_attempts set marking_preflight_at=now() where id='${attempt}'`);await asStudent(a)
 const submit=()=>db.query<{result:string}>(`select submit_interview_for_marking('${attempt}') result`)
 const results=await Promise.all([submit(),submit()])
 assert.deepEqual(results.map(r=>r.rows[0].result),['submitted','already_submitted'])
 await db.exec('reset role;')
 assert.equal((await db.query<{mmi_credits:number}>(`select mmi_credits from profiles where id='${a}'`)).rows[0].mmi_credits,1)
 await db.exec('set role service_role;')
 const jobs=await db.query<{id:string}>(`select * from claim_next_interview_job('worker-1')`)
 assert.equal(jobs.rows.length,1)
 assert.equal((await db.query(`select * from claim_next_interview_job('worker-2')`)).rows.length,0)
 assert.equal((await db.query<{ok:boolean}>(`select complete_interview_job('${jobs.rows[0].id}','wrong','{}') ok`)).rows[0].ok,false)
 assert.equal((await db.query<{ok:boolean}>(`select complete_interview_job('${jobs.rows[0].id}','worker-1','{"text":"A complete transcript", "model":"test"}') ok`)).rows[0].ok,true)
 assert.equal((await db.query(`select * from interview_processing_jobs where job_type='assess'`)).rows.length,1)
 const refund=()=>db.query<{result:string}>(`select refund_interview_marking('${attempt}','${admin}','No audible response') result`)
 assert.deepEqual((await Promise.all([refund(),refund()])).map(r=>r.rows[0].result),['refunded','already_refunded'])
 await db.exec('reset role;')
 assert.equal((await db.query<{mmi_credits:number}>(`select mmi_credits from profiles where id='${a}'`)).rows[0].mmi_credits,2)


 // A crashed final attempt is recovered as dead; terminal failure is observable.
 await db.exec(`update interview_attempts set marking_status='queued' where id='${attempt}'; update interview_processing_jobs set status='running',attempt_count=5,locked_at=now()-interval '11 minutes',locked_by='crashed' where attempt_id='${attempt}' and job_type='assess';`)
 await db.query(`select * from claim_next_interview_job('recovery')`)
 assert.equal((await db.query<{marking_status:string}>(`select marking_status from interview_attempts where id='${attempt}'`)).rows[0].marking_status,'needs_attention')
 assert.equal((await db.query<{status:string}>(`select status from interview_processing_jobs where attempt_id='${attempt}' and job_type='assess'`)).rows[0].status,'dead')
 // Retention must skip that unresolved submission even after 100 days.
 await db.exec(`update interview_attempts set media_kind='video',created_at=now()-interval '100 days' where id='${attempt}';`)
 assert.equal((await db.query<{n:number}>('select enqueue_interview_retention(90) n')).rows[0].n,0)
 // A separate submission can be marked manually without any AI key or completed AI job.
 const second='10000000-0000-4000-8000-000000000002'
 await db.exec(`insert into interview_attempts(id,user_id,format,station_id,station_title,recording_path,recording_mime_type,media_kind,duration_seconds) values('${second}','${a}','mmi','station','Station','${a}/${second}/response.webm','video/webm','video',90); insert into storage.objects(bucket_id,name) values('interview-recordings','${a}/${second}/response.webm');`)
 await db.exec(`update interview_attempts set marking_preflight_at=now() where id='${second}'`);await asStudent(a);await db.query(`select submit_interview_for_marking('${second}')`);await db.exec('reset role; set role service_role;')
 const feedback=JSON.stringify({overall:{score:5.5,band:'Strong developing response',summary:'Clear reasoning'},domains:[{key:'communication',label:'Communication',applicable:true,score:5.5,evidence:['Evidence'],comment:'Clear'}],strengths:['Clear'],priorities:['Specificity'],practice_task:'Try again',reviewer_note:'Reviewed and approved by an EMeducate reviewer.'})
 async function review(version:number,watched:boolean){return (await db.query<{result:string}>(`select review_interview_marking('${second}','${admin}',${version},'approve','${feedback}','private notes','private corrections',${watched}) result`)).rows[0].result}
 assert.equal(await review(0,false),'invalid_feedback')
 assert.equal(await review(99,true),'conflict')
 assert.deepEqual(await Promise.all([review(0,true),review(0,true)]),['released','already_released'])
 await asStudent(a)
 const publicAttempt=(await db.query<{approved_feedback:Record<string,unknown>}>(`select approved_feedback from interview_attempts where id='${second}'`)).rows[0]
 assert.equal(publicAttempt.approved_feedback.private_reviewer_notes,undefined)
 await assert.rejects(db.query(`select * from interview_markings`))
 await db.exec('reset role;')
 // Reserve retention before any deletion; pending review never qualifies.
 await db.exec(`update interview_attempts set created_at=now()-interval '100 days', released_at=now()-interval '91 days' where id='${second}';`)
 assert.equal((await db.query<{n:number}>(`select enqueue_interview_retention(90) n`)).rows[0].n,1)
 assert.equal((await db.query<{n:number}>(`select enqueue_interview_retention(90) n`)).rows[0].n,0)
 await db.exec(`delete from interview_attempts where id='${second}'`)
 await db.exec(`delete from interview_attempts where id='${attempt}'`)
 for(const table of ['interview_markings','interview_processing_jobs','interview_marking_events']) assert.equal((await db.query(`select * from ${table}`)).rows.length,0)
 await db.close()
})
