import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import * as crypto from 'node:crypto'
import ts from 'typescript'
import { PGlite } from '@electric-sql/pglite'

function load(file, deps = {}, globals = {}) {
  const box = { exports: {} }
  const code = ts.transpileModule(readFileSync(file,'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(code, { module: box, exports: box.exports, console, Buffer, Date, URL, URLSearchParams, Response, Request,
    require(id) { if (id==='server-only') return {}; assert(id in deps,`Unexpected dependency: ${id}`); return deps[id] }, ...globals })
  return box.exports
}

test('Zoom rejects the signing oracle, forged bodies and stale signatures; signed challenges and meetings work', async () => {
  let completions=0
  const secret='synthetic-test-secret'
  const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:{id:'session',plan_id:'plan',student_email:'student@example.test'}})}
  const {POST}=load('src/app/api/zoom/webhook/route.ts', {
    'node:crypto':crypto,'next/cache':{revalidatePath(){}},'next/server':{NextResponse:Response},
    '@/lib/supabase/admin':{createAdminClient:()=>({from:()=>q,rpc:async()=>{completions++;return {error:null}}})},
    '@/lib/zoom/client':{getZoomParticipants:async()=>[{email:'student@example.test'}]},
  }, {process:{env:{ZOOM_WEBHOOK_SECRET_TOKEN:secret}}})
  const now=String(Math.floor(Date.now()/1000))
  function request(body, timestamp=now, signed=true) {
    return new Request('https://example.test/webhook',{method:'POST',body,headers:signed?{
      'x-zm-request-timestamp':timestamp,'x-zm-signature':`v0=${crypto.createHmac('sha256',secret).update(`v0:${timestamp}:${body}`).digest('hex')}`,
    }:{}})
  }
  const meeting=JSON.stringify({event:'meeting.ended',payload:{object:{id:'meeting',duration:60}}})
  const challenge=JSON.stringify({event:'endpoint.url_validation',payload:{plainToken:`v0:${now}:${meeting}`}})
  const oracle=await POST(request(challenge,now,false))
  assert.equal(oracle.status,401);assert.equal((await oracle.json()).encryptedToken,undefined)
  assert.equal((await POST(request(meeting,now,false))).status,401)
  assert.equal((await POST(request(meeting,String(Number(now)-301)))).status,401)
  assert.equal((await POST(request(meeting,String(Number(now)+301)))).status,401)
  const tampered=request(meeting);tampered.headers.set('x-zm-signature',`v0=${'0'.repeat(64)}`)
  assert.equal((await POST(tampered)).status,401);assert.equal(completions,0)
  assert.equal((await POST(request('{'))).status,400)
  assert.equal((await POST(request(JSON.stringify({event:'endpoint.url_validation',payload:{plainToken:{bad:true}}})))).status,400)
  const legitimate=await POST(request(JSON.stringify({event:'endpoint.url_validation',payload:{plainToken:'zoom-challenge'}})))
  assert.equal(legitimate.status,200)
  assert.equal((await legitimate.json()).encryptedToken,crypto.createHmac('sha256',secret).update('zoom-challenge').digest('hex'))
  assert.equal((await POST(request(meeting))).status,200);assert.equal(completions,1)
})

test('all accepted login destinations remain on the app origin after URL normalization', () => {
  const {safeInternalPath}=load('src/lib/auth/roles.ts')
  for (const path of [null,'','https://attacker.test','//attacker.test','/\\attacker.test','/\t/attacker.test','/%5cattacker.test','/%2fattacker.test','/a/..//attacker.test','/%2e%2e//attacker.test','/%00evil','/%zz']) {
    assert.equal(safeInternalPath(path),null,JSON.stringify(path))
  }
  for(const path of ['/dashboard','/pricing?signup=success','/admin/study-plans/123#lessons','/a/../account','/login?next=%2Fdashboard']) {
    const result=safeInternalPath(path);assert(result);assert.equal(new URL(result,'https://app.test').origin,'https://app.test')
  }
})

test('signup authorization is issued only after successful CAPTCHA and rate limits; failures close signup', async () => {
  let allowed=true,verified=true,tickets=0,available=true
  const {verifySignupProtection}=load('src/lib/auth/signup-protection.ts',{
    'node:crypto':crypto,'next/headers':{headers:async()=>new Headers({'x-forwarded-for':'192.0.2.1'})},
    '@/lib/supabase/admin':{createAdminClient:()=>({rpc:async()=>({data:allowed,error:null})})},
    '@/lib/supabase/env':{getSupabaseSecretKey:()=> 'dummy'},
    '@/lib/auth/signup-authorization':{authorizeSignup:async()=>{tickets++;return available?'ticket':null}},
  },{process:{env:{TURNSTILE_SECRET_KEY:'dummy'}},fetch:async()=>Response.json({success:verified})})
  allowed=false;assert((await verifySignupProtection('a@test.example','challenge')).error);assert.equal(tickets,0)
  allowed=true;verified=false;assert((await verifySignupProtection('a@test.example','challenge')).error);assert.equal(tickets,0)
  verified=true;assert.equal((await verifySignupProtection('a@test.example','challenge')).authorization,'ticket')
  available=false;assert((await verifySignupProtection('a@test.example','challenge')).error)
})

test('real database rejects quota bypasses and direct signups, including concurrent/replayed tickets', async t => {
  const db=new PGlite();t.after(()=>db.close())
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key,email text,raw_app_meta_data jsonb default '{}',raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create table profiles(id uuid primary key references auth.users,role text,mmi_credits integer default 0);
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text unique,metadata jsonb);
    alter table storage.objects enable row level security;
    create function storage.foldername(text) returns text[] language sql as $$ select string_to_array($1,'/') $$;
    grant usage on schema public,auth,storage to anon,authenticated,service_role;
    alter default privileges in schema public grant all on tables to anon,authenticated,service_role;`)
  for(const name of ['0021_interview_recordings','0023_interview_transcripts','0033_interview_video_marking']) await db.exec(readFileSync(`supabase/migrations/${name}.sql`,'utf8'))
  const a=crypto.randomUUID(),b=crypto.randomUUID()
  await db.query('insert into auth.users(id) values($1),($2)',[a,b])
  const insertAttempt=async(user=a,audio=false)=>{
    const id=crypto.randomUUID()
    await db.query(`insert into interview_attempts(id,user_id,format,station_id,station_title,recording_path,recording_mime_type,transcription_audio_path,upload_status,media_kind)
      values($1,$2,'mmi','station','Station',$3,'video/webm',$4,'awaiting_upload','video')`,[id,user,`${user}/${id}/response.webm`,audio?`${user}/${id}/audio.webm`:null])
    return id
  }
  const prior=await insertAttempt()
  for(const name of ['0035_security_hardening','0036_require_signup_authorization']) await db.exec(readFileSync(`supabase/migrations/${name}.sql`,'utf8'))
  async function scalar(sql,params=[]) {return (await db.query(sql,params)).rows[0].result}
  assert.equal(await scalar("select count(*)::int result from interview_resource_usage where resource='recording'"),1)
  await db.exec('update interview_security_limits set recording_daily_limit=2')
  const second=await insertAttempt()
  await db.query("update interview_attempts set upload_status='ready' where id=$1",[second])
  await assert.rejects(insertAttempt(),/recording_daily_limit/)
  await db.query('delete from interview_attempts where id in ($1,$2)',[prior,second])
  await assert.rejects(insertAttempt(),/recording_daily_limit/)
  await db.exec("update interview_resource_usage set created_at=now()-interval '25 hours'")
  const concurrent=await Promise.allSettled([insertAttempt(),insertAttempt(),insertAttempt()])
  assert.equal(concurrent.filter(r=>r.status==='fulfilled').length,2)
  await db.exec('delete from interview_attempts; update interview_security_limits set recording_daily_limit=100,recording_storage_bytes=314572800')
  const reserved=await insertAttempt(a,true) // Both paths must reserve the bucket maximum.
  await assert.rejects(insertAttempt(),/recording_storage_limit/)
  await db.query(`insert into storage.objects(bucket_id,name,metadata) values('interview-recordings',$1,'{"size":1000}')`,[`${a}/${reserved}/response.webm`])
  await assert.rejects(insertAttempt(),/recording_storage_limit/) // An uploaded pending object is not double-counted or under-reserved.
  await db.query("update interview_attempts set upload_status='ready' where id=$1",[reserved])
  await insertAttempt() // Finalized small recordings release unused reservations.
  await db.exec('delete from interview_attempts; delete from storage.objects')
  await db.query(`insert into storage.objects(bucket_id,name,metadata) values('interview-recordings',$1,'{"size":314572800}')`,[`${a}/orphan.webm`])
  await assert.rejects(insertAttempt(),/recording_storage_limit/) // Deleting DB rows does not free retained objects.
  await db.exec('delete from storage.objects')
  await db.query(`insert into storage.objects(bucket_id,name,metadata) values('interview-recordings',$1,'{"size":"unknown"}')`,[`${a}/orphan.webm`])
  await assert.rejects(insertAttempt(a,true),/recording_storage_limit/)
  await db.exec('delete from storage.objects; update interview_security_limits set transcription_daily_limit=2,transcription_global_daily_limit=3')
  const consume=id=>scalar('select consume_interview_transcription($1) result',[id])
  assert.deepEqual(await Promise.all([consume(a),consume(a),consume(a)]),[true,true,false])
  assert.equal(await consume(b),true);assert.equal(await consume(b),false)
  await db.query('delete from auth.users where id=$1',[b]);assert.equal(await consume(a),false) // Global usage survives account deletion.
  assert.equal(await scalar("select count(*)::int result from interview_resource_usage where resource='transcription'"),3)
  await db.exec("update interview_resource_usage set created_at=now()-interval '25 hours'")
  assert.equal(await consume(a),true)
  const queued=await insertAttempt()
  await db.query("update interview_attempts set upload_status='ready' where id=$1",[queued])
  await db.query("insert into interview_processing_jobs(attempt_id,job_type) values($1,'transcribe')",[queued])
  const job=(await db.query("select * from claim_next_interview_job('worker')")).rows[0]
  assert.equal(await scalar("select defer_interview_transcription($1,'wrong') result",[job.id]),false)
  assert.equal(await scalar("select defer_interview_transcription($1,'worker') result",[job.id]),true)
  assert.equal(await scalar('select attempt_count result from interview_processing_jobs where id=$1',[job.id]),0)
  assert.equal((await db.query("select * from claim_next_interview_job('worker')")).rows.length,0)

  const signup=(email,token,appProvider='email',userProvider='email')=>db.query(`insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data) values($1,$2,$3,$4) returning raw_user_meta_data`,[
    crypto.randomUUID(),email,{provider:appProvider},{signup_authorization:token,provider:userProvider,full_name:'Student'}])
  const token=crypto.randomBytes(32).toString('hex'),hash=crypto.createHash('sha256').update(token).digest('hex')
  await assert.rejects(signup('student@example.test',null),/signup_authorization_required/)
  await assert.rejects(signup('student@example.test',null,'email','google'),/signup_authorization_required/)
  await db.query('select authorize_signup($1,$2)',['student@example.test',hash])
  await assert.rejects(signup('other@example.test',token),/signup_authorization_required/)
  const registrations=await Promise.allSettled([signup('STUDENT@example.test',token),signup('student@example.test',token)])
  assert.equal(registrations.filter(r=>r.status==='fulfilled').length,1)
  assert.equal(registrations.find(r=>r.status==='fulfilled').value.rows[0].raw_user_meta_data.signup_authorization,undefined)
  await db.query('select authorize_signup($1,$2)',['expired@example.test',hash])
  await db.exec("update signup_authorizations set expires_at=now()-interval '1 second'")
  await assert.rejects(signup('expired@example.test',token),/signup_authorization_required/)
  await signup('google@example.test',null,'google')
  // Invitations carry an ordinary ticket too; no spoofable invited/provider exemption.
  await db.query('select authorize_signup($1,$2)',['invited@example.test',hash])
  await signup('invited@example.test',token)
  for(const role of ['anon','authenticated']) {
    await db.exec(`set role ${role}`)
    for(const sql of ["select authorize_signup('x@example.test',repeat('a',64))",`select consume_interview_transcription('${a}')`,
      `select defer_interview_transcription('${job.id}','attacker')`,'select * from signup_authorizations','select * from interview_resource_usage',
      'update interview_security_limits set recording_daily_limit=9999']) await assert.rejects(db.query(sql))
    await db.exec('reset role')
  }
})
