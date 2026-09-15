import {test} from 'node:test'
import assert from 'node:assert/strict'
import {fullDatabase} from './helpers/full-database.mjs'
import {loadModule} from './helpers/load-module.mjs'
import {operationMessages} from '../src/lib/interviews/operation-messages'
import {uploadRetryDelays} from '../src/lib/interviews/upload-admission'
const id=(n:number)=>`a1000000-0000-4000-8000-${String(n).padStart(12,'0')}`
test('upload admission bounds global and per-account work, orders waiting students, renews and releases only the matching lease',async()=>{
 const db=await fullDatabase()
 const slot=async(n:number,action='acquire',user=n)=>(await db.query<{r:boolean}>('select interview_upload_slot($1,$2,$3,$4) r',[id(100+n),id(user),id(50+n),action])).rows[0].r
 try{
  for(let n=1;n<=10;n++){
   await db.query('insert into auth.users(id) values($1)',[id(n)])
   await db.query("insert into interview_attempts(id,user_id,format,station_id,station_title,recording_path,recording_mime_type) values($1,$2,'mmi','test','test',$3,'video/webm')",[id(50+n),id(n),`fixture/${n}`])
  }
  for(let n=1;n<=8;n++)assert.equal(await slot(n),true)
  assert.equal(await slot(9),false);assert.equal(await slot(10),false)
  await assert.rejects(slot(1,'release',2),/Not owned/)
  assert.equal(await slot(1,'renew'),true);assert.equal(await slot(1,'release'),true)
  // Polling the younger request still awards the older queued student first.
  assert.equal(await slot(10),false);assert.equal(await slot(9),true)
  await db.query('insert into interview_upload_slots(id,user_id,attempt_id) values($1,$2,$3)',[id(201),id(2),id(52)])
  assert.equal((await db.query<{r:boolean}>('select interview_upload_slot($1,$2,$3) r',[id(201),id(2),id(52)])).rows[0].r,false)
  await db.query("update interview_upload_slots set lease_until=now()-interval '1 second' where id=$1",[id(102)])
  assert.equal(await slot(2,'renew'),false)
  assert.equal(await slot(10),true)
  await db.exec('set role authenticated')
  await assert.rejects(slot(1),/permission denied/)
 }finally{await db.close()}
})
test('overdue marking preserves evidence, counts whole panels once, queues deduplicated alerts and sends recovery after delivery',async()=>{
 const db=await fullDatabase()
 const check=async()=>(await db.query<{r:{issues:string[];metrics:{overdue_reviews:number}}}>('select check_interview_operations() r')).rows[0].r
 try{
  await db.query('insert into auth.users(id) values($1)',[id(1)])
  await db.query("insert into interview_attempts(id,user_id,format,station_id,station_title,recording_path,recording_mime_type,upload_status,marking_status,submitted_for_marking_at,transcript) values($1,$2,'mmi','test','test','fixture','video/webm','ready','awaiting_review',now()-interval '8 days','Private evidence')",[id(2),id(1)])
  await db.query("insert into interview_mock_markings(id,mock_session_id,user_id,status,credits_spent,created_at) values($1,$2,$3,'in_review',12,now()-interval '9 days')",[id(3),id(4),id(1)])
  await db.query('insert into interview_mock_marking_members(marking_id,attempt_id,sequence_index) values($1,$2,0)',[id(3),id(2)])
  assert.equal((await check()).metrics.overdue_reviews,1)
  assert.ok((await check()).issues.includes('review_overdue'))
  assert.equal((await db.query<{n:number}>('select count(*)::int n from interview_alert_deliveries')).rows[0].n,1)
  const alert=(await db.query<{r:{id:string}}>('select claim_interview_alert($1) r',[id(5)])).rows[0].r
  assert.ok(alert)
  assert.equal((await db.query<{r:unknown}>('select claim_interview_alert($1) r',[id(6)])).rows[0].r,null)
  assert.equal((await db.query<{r:boolean}>('select finish_interview_alert($1,$2) r',[alert.id,id(6)])).rows[0].r,false)
  await db.query('select finish_interview_alert($1,$2)',[alert.id,id(5)])
  await db.query("update interview_alert_deliveries set created_at=now()-interval '25 hours'")
  await check();await check()
  assert.equal((await db.query<{n:number}>("select count(*)::int n from interview_alert_deliveries where kind='reminder'")).rows[0].n,1)
  // A tutor edit changes updated_at, but must not reset the submission age.
  await db.query('update interview_mock_markings set updated_at=now()')
  assert.equal((await check()).metrics.overdue_reviews,1)
  await db.query("update interview_mock_markings set status='released'")
  assert.equal((await check()).metrics.overdue_reviews,0)
  await check()
  assert.equal((await db.query<{n:number}>("select count(*)::int n from interview_alert_deliveries where kind='resolved'")).rows[0].n,1)
  assert.equal((await db.query<{transcript:string}>('select transcript from interview_attempts')).rows[0].transcript,'Private evidence')
  await db.exec('set role authenticated')
  await assert.rejects(db.query('select * from interview_overdue_reviews'),/permission denied/)
  await assert.rejects(db.query('select claim_interview_alert($1)',[id(1)]),/permission denied/)
 }finally{await db.close()}
})
test('alert delivery requires configuration, uses bounded attempts and never includes student evidence or raw provider errors',async()=>{
 let configured='',claims=0,failed=false,finished:unknown[]=[]
 const alert={id:id(1),code:'review_overdue',kind:'opened',episode_at:'2026-09-01T00:00:00Z',created_at:'2026-09-08T00:00:00Z',transcript:'PRIVATE'}
 const env={get INTERVIEW_ALERT_WEBHOOK_URL(){return configured}}
 const api=loadModule('src/lib/interviews/operation-alerts.ts',{'@/lib/supabase/admin':{createAdminClient:()=>({rpc:async(name:string,args:unknown)=>{if(name==='claim_interview_alert'){claims++;return {data:claims===1?alert:null}}finished.push(args);return {data:true}}})},'./operation-messages':{operationMessages}},{AbortSignal,process:{env},fetch:async(_url:string,options:{body:string;redirect:string})=>{assert.ok(!options.body.includes('PRIVATE'));assert.equal(options.redirect,'error');return new Response(null,{status:failed?500:200})}}) as {deliverInterviewAlerts:()=>Promise<{configured:boolean;sent:number;failed:number}>}
 assert.equal((await api.deliverInterviewAlerts()).configured,false);assert.equal(claims,0)
 configured='http://example.invalid';assert.equal((await api.deliverInterviewAlerts()).configured,false)
 configured='https://example.invalid/webhook';assert.equal((await api.deliverInterviewAlerts()).sent,1)
 claims=0;finished=[];failed=true;assert.equal((await api.deliverInterviewAlerts()).failed,1);assert.equal(claims,1)
 assert.equal((finished[0] as {p_error:string}).p_error,'delivery_failed')
})
test('upload retry jitter spreads transfer bursts within bounded delays',()=>{
 assert.deepEqual(uploadRetryDelays(()=>0),[750,2250,4500,9000,15000])
 assert.deepEqual(uploadRetryDelays(()=>1),[1250,3750,7500,15000,25000])
})
test('email alerts use the configured recipient and stable provider idempotency keys',async()=>{
 let claims=0
 const api=loadModule('src/lib/interviews/operation-alerts.ts',{'@/lib/supabase/admin':{createAdminClient:()=>({rpc:async(name:string)=>({data:name==='claim_interview_alert'?(claims++===0?{id:id(1),code:'cleanup_overdue',kind:'opened',episode_at:'2026-09-01T00:00:00Z'}:null):true})})},'./operation-messages':{operationMessages}},{AbortSignal,process:{env:{INTERVIEW_ALERT_RESEND_API_KEY:'test-only',INTERVIEW_ALERT_EMAIL_TO:'recipient@example.invalid',INTERVIEW_ALERT_EMAIL_FROM:'sender@example.invalid'}},fetch:async(url:string,options:{headers:Record<string,string>;body:string})=>{
  assert.equal(url,'https://api.resend.com/emails');assert.equal(options.headers['Idempotency-Key'],`interview-alert/${id(1)}`)
  const body=JSON.parse(options.body);assert.deepEqual(body.to,['recipient@example.invalid']);assert.match(body.text,/deletion/);assert.ok(!options.body.includes('test-only'))
  return new Response(null,{status:200})
 }}) as {deliverInterviewAlerts:()=>Promise<{sent:number}>}
 assert.equal((await api.deliverInterviewAlerts()).sent,1)
})
test('an abort while waiting cancels admission and releases its queued ticket without starting an upload',async()=>{
 const controller=new AbortController(),actions:string[]=[];let started=false
 const api=loadModule('src/lib/interviews/upload-admission.ts',{}, {AbortController,AbortSignal,setTimeout,clearTimeout,fetch:async(_url:string,options:{body:string})=>{const {action}=JSON.parse(options.body);actions.push(action);if(action==='acquire')controller.abort();return Response.json({granted:false})}}) as {withUploadSlot:(id:string,s:AbortSignal,p:()=>void,fn:()=>Promise<void>)=>Promise<void>}
 await assert.rejects(api.withUploadSlot(id(1),controller.signal,()=>{},async()=>{started=true}),/paused/)
 assert.equal(started,false);assert.deepEqual(actions,['acquire','release'])
})
test('upload slot endpoint denies non-owners and invalid requests before privileged admission',async()=>{
 let owns=false,calls=0
 class ApiError extends Error{constructor(message:string,public status=400){super(message)}}
 const route=loadModule('src/app/api/interviews/attempts/[attemptId]/upload-slot/route.ts',{'@/lib/interviews/api':{ownedAttempt:async()=>{if(!owns)throw new ApiError('Missing',404);return {user:{id:id(1)},attempt:{upload_status:'awaiting_upload'},db:{rpc:async(_name:string,args:{p_user:string})=>{calls++;assert.equal(args.p_user,id(1));return {data:true}}}}},readSmallJson:(r:Request)=>r.json(),InterviewApiError:ApiError,apiError:(e:ApiError)=>Response.json({}, {status:e.status??503})}}) as {POST:(r:Request,c:unknown)=>Promise<Response>}
 const call=(body:unknown)=>route.POST(new Request('https://example.invalid',{method:'POST',body:JSON.stringify(body)}),{params:Promise.resolve({attemptId:id(2)})})
 assert.equal((await call({id:id(3),action:'acquire'})).status,404);owns=true
 assert.equal((await call({id:'bad',action:'acquire'})).status,400);assert.equal(calls,0)
 assert.equal((await call({id:id(3),action:'acquire',user:'forged'})).status,200);assert.equal(calls,1)
})
test('a transport with no progress is paused after two minutes so it cannot hold an upload slot indefinitely',async()=>{
 let watchdog:(()=>void)|undefined,aborted=false
 const api=loadModule('src/lib/interviews/video-upload.ts',{
  'tus-js-client':{Upload:class {async findPreviousUploads(){return []}start(){}async abort(){aborted=true}}},
  '@/lib/supabase/client':{createClient:()=>({auth:{getSession:async()=>({data:{session:{access_token:'synthetic'}}})}})},
  './media-validation':{baseMime:(s:string)=>s},'./upload-admission':{withUploadSlot:async(_id:string,signal:AbortSignal,_phase:unknown,upload:(s:AbortSignal)=>Promise<void>)=>upload(signal),uploadRetryDelays:()=>[]},
 },{AbortSignal,process:{env:{NEXT_PUBLIC_SUPABASE_URL:'https://example.supabase.co'}},setTimeout:(fn:()=>void,ms:number)=>{assert.equal(ms,120000);watchdog=fn;return 1},clearTimeout:()=>{}}) as {uploadInterviewMedia:(b:Blob,p:string,onProgress:()=>void,s:AbortSignal)=>Promise<void>}
 const promise=api.uploadInterviewMedia(new Blob(['sample'],{type:'audio/webm'}),'owner/attempt/response.webm',()=>{},new AbortController().signal)
 await new Promise(resolve=>setImmediate(resolve));assert.ok(watchdog);watchdog!()
 await assert.rejects(promise,/stopped making progress/);assert.equal(aborted,true)
})
test('an HTML response from a replaced deployment leaves the recording intact and shows a useful retry message',async()=>{
 const actions:string[]=[];let started=false
 const api=loadModule('src/lib/interviews/upload-admission.ts',{}, {AbortController,AbortSignal,setTimeout,clearTimeout,fetch:async(_url:string,options:{body:string})=>{actions.push(JSON.parse(options.body).action);return new Response('<!DOCTYPE html><p>Internal details</p>',{headers:{'Content-Type':'text/html'}})}}) as {withUploadSlot:(id:string,s:AbortSignal,p:()=>void,fn:()=>Promise<void>)=>Promise<void>}
 await assert.rejects(api.withUploadSlot(id(1),new AbortController().signal,()=>{},async()=>{started=true}),error=>/service changed/.test(String((error as Error).message))&&!/Internal details|Unexpected token/.test(String((error as Error).message)))
 assert.equal(started,false);assert.deepEqual(actions,['acquire','release'])
})
