import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { completeMock,mockMembership } from '../src/lib/interviews/mock-marking'
const user='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002'
test('whole-mock marking is owner-bound, complete, atomic and retryable for MMI and panel',async()=>{
 const db=new PGlite()
 try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;
 create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table profiles(id uuid primary key references auth.users,role text,mmi_credits integer default 0);
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;
 create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;
 grant usage on schema public,auth,storage to anon,authenticated,service_role;grant all on all tables in schema public,storage to authenticated,service_role;`)
 for(const file of ['0021_interview_recordings.sql','0023_interview_transcripts.sql','0033_interview_video_marking.sql','0038_mock_interview_batch_marking.sql','0039_interview_marking_prices.sql'])await db.exec(readFileSync(`supabase/migrations/${file}`,'utf8'))
 await db.exec(`insert into auth.users values('${user}'),('${other}');insert into profiles values('${user}','student',0),('${other}','student',0);grant select on interview_attempts to authenticated;`)
 const student=async(id=user)=>db.exec(`reset role;set role authenticated;set request.jwt.claim.sub='${id}';`)
 async function seed(format:'mmi'|'panel',batch:number){
  await db.exec('reset role;')
  const session=`20000000-0000-4000-8000-${String(batch).padStart(12,'0')}`,total=format==='mmi'?8:10
  for(let i=0;i<total;i++){
   const id=`10000000-0000-4000-8000-${String(batch*100+i).padStart(12,'0')}`,snapshot=JSON.stringify({mock_session:{id:session,mode:'full',index:i,total}})
   await db.query(`insert into interview_attempts(id,user_id,format,station_id,station_title,recording_path,recording_mime_type,media_kind,upload_status,marking_preflight_at,station_snapshot) values($1,$2,$3,'test','Test',$4,'video/webm','video','ready',now(),$5::jsonb)`,[id,user,format,`${user}/${id}/response.webm`,snapshot])
   await db.query(`insert into storage.objects(bucket_id,name) values('interview-recordings',$1)`,[`${user}/${id}/response.webm`])
  }
  return session
 }
 const submit=async(id:string,cost:number)=>(await db.query<{result:{status:string;charged?:number}}>('select submit_mock_interview_for_marking($1,$2) result',[id,cost])).rows[0].result
 const count=async(table:string)=>(await db.query<{n:number}>(`select count(*)::int n from ${table}`)).rows[0].n
 const balance=async()=>(await db.query<{n:number}>(`select mmi_credits n from profiles where id='${user}'`)).rows[0].n
 const mmi=await seed('mmi',1);await student(other);assert.equal((await submit(mmi,12)).status,'not_ready')
 await db.exec('reset role;set role anon;');await assert.rejects(submit(mmi,12))
 await student();assert.equal((await submit(mmi,12)).status,'no_credits');await db.exec('reset role;');assert.equal(await count('interview_markings'),0)
 await db.exec(`update profiles set mmi_credits=30 where id='${user}';update interview_attempts set marking_preflight_at=null where id='10000000-0000-4000-8000-000000000107';`)
 await student();assert.equal((await submit(mmi,12)).status,'not_ready');await db.exec('reset role;');assert.equal(await balance(),30)
 await db.exec(`update interview_attempts set marking_preflight_at=now();
 create function fail_late_batch() returns trigger language plpgsql as $$begin if new.id='10000000-0000-4000-8000-000000000107' and new.marking_status='queued' then raise exception 'test failure';end if;return new;end$$;
 create trigger fail_late_batch before update on interview_attempts for each row execute function fail_late_batch();`)
 await student();assert.equal((await submit(mmi,12)).status,'not_ready');await db.exec('reset role;')
 assert.equal(await balance(),30);assert.equal(await count('interview_markings'),0);assert.equal(await count('interview_processing_jobs'),0);assert.equal(await count('interview_marking_events'),0)
 await db.exec('drop trigger fail_late_batch on interview_attempts;');await student()
 assert.equal((await submit(mmi,7)).status,'quote_changed')
 assert.equal((await db.query<{r:string}>(`select submit_interview_for_marking('10000000-0000-4000-8000-000000000100') r`)).rows[0].r,'quote_changed')
 await assert.rejects(db.query(`select enqueue_priced_interview_marking('10000000-0000-4000-8000-000000000100',0)`))
 const first=(await db.query<{r:string}>(`select submit_interview_for_marking('10000000-0000-4000-8000-000000000100',2) r`)).rows[0].r;assert.equal(first,'submitted')
 assert.equal((await submit(mmi,12)).status,'quote_changed')
 const results=await Promise.all([submit(mmi,10),submit(mmi,10)]);assert.deepEqual(results,[{status:'submitted',charged:10},{status:'already_submitted',charged:0}])
 await db.exec('reset role;');assert.equal(await balance(),18);assert.equal(await count('interview_markings'),8);assert.equal(await count('interview_marking_events'),8)
 const panel=await seed('panel',2);await student();assert.deepEqual(await submit(panel,12),{status:'submitted',charged:12});await db.exec('reset role;');assert.equal(await balance(),6)
 const charges=(await db.query<{credits_spent:number}>(`select credits_spent from interview_attempts where station_snapshot->'mock_session'->>'id'='${panel}' order by id`)).rows.map(r=>r.credits_spent)
 assert.deepEqual(charges,[2,2,1,1,1,1,1,1,1,1])
 await db.exec(`update profiles set role='admin' where id='${other}';`)
 await db.exec('set role service_role;')
 assert.equal((await db.query<{r:string}>(`select refund_interview_marking('10000000-0000-4000-8000-000000000200','${other}','test') r`)).rows[0].r,'refunded')
 await db.exec('reset role;');assert.equal(await balance(),8)
 const single=await seed('panel',4);void single
 await student();assert.equal((await db.query<{r:string}>(`select submit_interview_for_marking('10000000-0000-4000-8000-000000000400',2) r`)).rows[0].r,'quote_changed')
 assert.equal((await db.query<{r:string}>(`select submit_interview_for_marking('10000000-0000-4000-8000-000000000400',1) r`)).rows[0].r,'submitted')
 await db.exec('reset role;');assert.equal(await balance(),7)
 const broken=await seed('mmi',3)
 await db.exec(`delete from storage.objects where name like '%000000000307/response.webm'`);await student();assert.equal((await submit(broken,12)).status,'not_ready')
 await db.exec(`reset role;update interview_attempts set station_snapshot=jsonb_set(station_snapshot,'{mock_session,index}','0') where id='10000000-0000-4000-8000-000000000307';`);await student();assert.equal((await submit(broken,12)).status,'not_ready')
 await db.exec(`reset role;delete from interview_attempts where id='10000000-0000-4000-8000-000000000307';`);await student();assert.equal((await submit(broken,7)).status,'not_ready')
 }finally{await db.close()}
})
test('full-mock membership rejects incomplete, duplicate and forged grouping metadata',()=>{
 const id='20000000-0000-4000-8000-000000000001'
 const rows=Array.from({length:8},(_,index)=>({format:'mmi' as const,station_snapshot:{mock_session:{id,mode:'full',index,total:8}}}))
 assert.equal(completeMock(rows,id),true);assert.equal(completeMock(rows.slice(1),id),false)
 assert.equal(completeMock([...rows.slice(1),rows[1]],id),false)
 assert.equal(mockMembership({mock_session:{id,mode:'individual',index:0,total:8}},'mmi'),null)
 assert.equal(mockMembership(rows[0].station_snapshot,'panel'),null)
})
