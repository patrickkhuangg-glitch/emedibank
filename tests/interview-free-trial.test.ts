import {test} from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {fullDatabase} from './helpers/full-database.mjs'
import {TRIAL_MMI_IDS,TRIAL_PANEL_IDS,trialQuestionAllowed} from '../src/lib/interviews/trial-catalog'
import {trialStations} from '../src/lib/interviews/trial-stations'
import {makeTrialMockSteps,makeMockSteps} from '../src/lib/interviews/mock-plan'
import {INTERVIEW_STATIONS} from '../src/lib/interviews/stations'

test('fixed trial catalogue exposes only fifteen MMI and one question from all 32 panel themes',()=>{
 const stations=trialStations()
 assert.equal(stations.filter(s=>s.format==='mmi').length,15)
 assert.equal(stations.filter(s=>s.format==='panel').length,32)
 assert.ok(stations.every(s=>!s.examinerFeedback))
 assert.ok(stations.filter(s=>s.format==='panel').every(s=>s.questions.length===1))
 assert.ok(TRIAL_PANEL_IDS.every(id=>trialQuestionAllowed(id,0)&&!trialQuestionAllowed(id,1)))
 assert.equal(trialQuestionAllowed('forged'),false)
 const panel=makeTrialMockSteps({format:'panel',mode:'full'})
 assert.equal(panel.length,10);assert.equal(new Set(panel.map(s=>s.stationId)).size,10)
 assert.equal(panel[0].stationId,'panel-motivation');assert.ok(panel.every(s=>s.responseSeconds===120&&s.questionIndex===0))
 assert.equal(makeTrialMockSteps({format:'mmi',mode:'full'}).length,2)
 assert.equal(makeMockSteps({format:'mmi',mode:'full'}).length,8)
 assert.equal(new Set(makeMockSteps({format:'panel',mode:'full'}).map(s=>s.stationId)).size,5)
 const paid=INTERVIEW_STATIONS.find(s=>s.format==='mmi'&&!TRIAL_MMI_IDS.includes(s.id))!
 assert.throws(()=>makeTrialMockSteps({format:'mmi',mode:'individual',selectionId:paid.id}))
})

test('verified one-time grant, aliases, durable minutes, mock retries, storage and private trial state',async()=>{
 const db=await fullDatabase(),user=randomUUID(),other=randomUUID(),hash='a'.repeat(64)
 const scalar=async(sql:string,args:unknown[]=[])=>Object.values((await db.query(sql,args)).rows[0] as object)[0]
 try{
  await db.exec('alter table auth.users add column email_confirmed_at timestamptz;update interview_trial_settings set enabled=true;')
  await db.query('insert into auth.users(id,email) values($1,$2),($3,$4)',[user,'one@gmail.com',other,'two@gmail.com'])
  assert.equal(await scalar('select start_interview_trial($1,$2)',[user,hash]),false)
  await db.exec('update auth.users set email_confirmed_at=now()')
  const starts=await Promise.all(Array.from({length:8},()=>scalar('select start_interview_trial($1,$2)',[user,hash])))
  assert.ok(starts.every(Boolean));assert.equal(await scalar('select mmi_credits from profiles where id=$1',[user]),2)
  assert.equal(await scalar('select start_interview_trial($1,$2)',[other,hash]),false)
  const mock=randomUUID(),first=await scalar("select claim_interview_trial_mock($1,$2,'panel')",[user,mock])
  assert.deepEqual(await scalar("select claim_interview_trial_mock($1,$2,'panel')",[user,mock]),first)
  assert.equal(await scalar("select claim_interview_trial_mock($1,$2,'panel')",[user,randomUUID()]),null)
  const attempts:string[]=[]
  for(let i=0;i<9;i++)attempts.push(await scalar("insert into interview_attempts(user_id,format,station_id,station_title,recording_path,recording_mime_type,media_kind) values($1,'mmi','mmi-team-disagreement','Team',$2,'audio/webm','audio') returning id",[user,`${user}/${randomUUID()}/response.webm`]) as string)
  const reserved=await Promise.all(attempts.map(id=>scalar('select reserve_interview_trial_seconds($1,$2,480)',[user,id])))
  assert.equal(reserved.filter(Boolean).length,7)
  assert.equal(await scalar('select reserve_interview_trial_seconds($1,$2,480)',[user,attempts[0]]),true)
  assert.equal(await scalar('select seconds_reserved from interview_trial_claims where user_id=$1',[user]),3360)
  assert.equal(await scalar("select admit_interview_trial_provider($1,$2,'transcribe',490,'fingerprint')",[user,attempts[0]]),'allowed')
  assert.equal(await scalar("select admit_interview_trial_provider($1,$2,'transcribe',490,'fingerprint')",[user,attempts[1]]),'duplicate')
  assert.equal(await scalar("select admit_interview_trial_provider($1,$2,'transcribe',490,'fingerprint')",[user,attempts[0]]),'allowed')
  assert.equal(await scalar("select admit_interview_trial_provider($1,$2,'transcribe',490,'fingerprint')",[user,attempts[0]]),'exhausted')
  await db.query('delete from interview_attempts where id=$1',[attempts[0]])
  assert.equal(await scalar('select seconds_reserved from interview_trial_claims where user_id=$1',[user]),3370)
  const path=await scalar('select recording_path from interview_attempts where id=$1',[attempts[1]])
  await assert.rejects(db.query("insert into storage.objects(bucket_id,name,metadata) values('interview-recordings',$1,'{\"size\":25165825}')",[path]),/trial_file_too_large/)
  await db.query("insert into storage.objects(bucket_id,name,metadata) values('interview-recordings',$1,'{\"size\":1024}')",[path])
  await db.query("update interview_trial_claims set expires_at=now()-interval '1 second' where user_id=$1",[user])
  assert.equal((await scalar('select interview_trial_access($1)',[user]) as {kind:string}).kind,'expired')
  assert.equal(await scalar('select start_interview_trial($1,$2)',[user,hash]),false)
  await assert.rejects(db.query("insert into interview_study_notes(user_id,body) values($1,'new note')",[user]),/trial_inactive/)
  await db.exec('set role authenticated')
  await assert.rejects(db.exec('select * from interview_trial_claims'),/permission denied/)
  await assert.rejects(db.query('select start_interview_trial($1,$2)',[user,hash]),/permission denied/)
  await db.exec('reset role')
  await db.query('delete from auth.users where id=$1',[user])
  assert.equal(await scalar('select start_interview_trial($1,$2)',[other,hash]),false)
 }finally{await db.close()}
})

test('trial spending pause, monthly warning, fair single trial worker and paid independence',async()=>{
 const db=await fullDatabase(),trial=randomUUID(),paid=randomUUID()
 const scalar=async(sql:string,args:unknown[]=[])=>Object.values((await db.query(sql,args)).rows[0] as object)[0]
 try{
  await db.exec('alter table auth.users add column email_confirmed_at timestamptz;update interview_trial_settings set enabled=true,monthly_budget_cents=100,warning_cents=50')
  await db.query('insert into auth.users(id,email_confirmed_at) values($1,now()),($2,now())',[trial,paid])
  await db.query("update profiles set role='admin' where id=$1",[paid])
  await scalar('select start_interview_trial($1,$2)',[trial,'b'.repeat(64)])
  const ids:string[]=[]
  for(const user of [trial,trial,paid,paid]){
   const id=await scalar("insert into interview_attempts(user_id,format,station_id,station_title,recording_path,recording_mime_type,media_kind,upload_status,duration_seconds) values($1,'mmi','mmi-team-disagreement','Team',$2,'audio/webm','audio','ready',60) returning id",[user,randomUUID()]) as string
   ids.push(id);await db.query("insert into interview_processing_jobs(attempt_id,job_type) values($1,'transcribe')",[id])
  }
  const jobs=[];for(let i=0;i<4;i++)jobs.push(await scalar("select claim_fair_interview_job('worker',false,null)"))
  assert.equal(jobs.filter(Boolean).length,3)
  assert.equal(await scalar("select admit_interview_trial_provider($1,$2,'assess')",[trial,ids[0]]),'allowed')
  const check=await scalar('select check_interview_operations()') as {issues:string[]}
  assert.ok(check.issues.includes('trial_spending'))
  await scalar('select check_interview_operations()')
  assert.equal(await scalar("select count(*)::int from interview_alert_deliveries where code='trial_spending' and kind='opened'"),1)
  await db.exec('update interview_trial_settings set processing_paused=true')
  assert.equal(await scalar("select admit_interview_trial_provider($1,$2,'audit')",[trial,ids[0]]),'paused')
  assert.equal(await scalar("select admit_interview_trial_provider($1,$2,'assess')",[paid,ids[2]]),'full')
  await db.exec('update interview_trial_settings set processing_paused=false')
  assert.equal(await scalar("select admit_interview_trial_provider($1,$2,'audit')",[trial,ids[0]]),'allowed')
  assert.equal(await scalar("select admit_interview_trial_provider($1,$2,'layout')",[trial,ids[0]]),'budget')
 }finally{await db.close()}
})

test('trial access requires a verified email and configured identity key, rejects locked questions and hashes aliases consistently',async()=>{
 const {loadModule}=await import('./helpers/load-module.mjs')
 const crypto=await import('node:crypto')
 class GateError extends Error {constructor(message:string,public status:number){super(message)}}
 let kind='eligible',grant=false,key:string|undefined=undefined
 const access=loadModule('src/lib/interviews/trial.ts',{'node:crypto':crypto,'./api':{InterviewApiError:GateError},'./trial-catalog':{trialQuestionAllowed},'@/lib/supabase/admin':{createAdminClient:()=>({rpc:async(name:string)=>name==='start_interview_trial'?{data:grant,error:null}:{data:{kind,secondsRemaining:3600,credits:0},error:null}})}},{process:{env:{get INTERVIEW_TRIAL_IDENTITY_SECRET(){return key}}}}) as typeof import('../src/lib/interviews/trial')
 const user={id:'student',email:'Example.Name+trial@googlemail.com',email_confirmed_at:'2026-09-08'}
 assert.equal(access.normaliseTrialEmail(user.email),'examplename@gmail.com')
 assert.equal(access.normaliseTrialEmail('first.last+tag@school.edu'),'first.last+tag@school.edu')
 await assert.rejects(access.requireInterviewPractice({...user,email_confirmed_at:undefined},TRIAL_MMI_IDS[0],0,true),/Verify your email/)
 await assert.rejects(access.requireInterviewPractice(user,'paid-question',0,true),/full interview access/)
 await assert.rejects(access.requireInterviewPractice(user,TRIAL_MMI_IDS[0],0,true),/being configured/)
 key='synthetic-identity-key-at-least-32-characters';grant=true;kind='active'
 assert.equal((await access.requireInterviewPractice(user,TRIAL_MMI_IDS[0],0,true)).kind,'active')
 kind='expired';await assert.rejects(access.requireInterviewPractice(user),/ended/)
 kind='full';assert.equal((await access.requireInterviewPractice(user,'paid-question',4)).kind,'full')
})

test('server audio inspection measures real PCM packets, rejects malformed and overlong audio, fingerprints content',async()=>{
 const {inspectTrialAudio}=await import('../src/lib/interviews/trial-media')
 // Deterministic synthetic one-second PCM sine wave; no microphone or student data.
 const samples=16000,bytes=Buffer.alloc(44+samples*2)
 bytes.write('RIFF');bytes.writeUInt32LE(bytes.length-8,4);bytes.write('WAVEfmt ',8);bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(1,22);bytes.writeUInt32LE(16000,24);bytes.writeUInt32LE(32000,28);bytes.writeUInt16LE(2,32);bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(samples*2,40)
 for(let i=0;i<samples;i++)bytes.writeInt16LE(Math.round(Math.sin(i/16000*440*Math.PI*2)*8000),44+i*2)
 const blob=new Blob([bytes],{type:'audio/wav'}),first=await inspectTrialAudio(blob)
 assert.equal(first.seconds,1);assert.equal(first.fingerprint,(await inspectTrialAudio(blob)).fingerprint)
 await assert.rejects(inspectTrialAudio(blob,0),/trial_audio_duration/)
 await assert.rejects(inspectTrialAudio(new Blob(['not audio'])))
 await assert.rejects(inspectTrialAudio(new Blob([new Uint8Array(25*1024*1024)])),/trial_audio_size/)
})

test('welcome credits cannot mark individual panel responses and still fund one MMI review exactly once',async()=>{
 const db=await fullDatabase(),user=randomUUID()
 const scalar=async(sql:string,args:unknown[]=[])=>Object.values((await db.query(sql,args)).rows[0] as object)[0]
 try{
  await db.exec('alter table auth.users add column email_confirmed_at timestamptz;update interview_trial_settings set enabled=true')
  await db.query('insert into auth.users(id,email_confirmed_at) values($1,now())',[user])
  await scalar('select start_interview_trial($1,$2)',[user,'c'.repeat(64)])
  const ids:string[]=[]
  for(let i=0;i<3;i++){
   const path=`${user}/${randomUUID()}/practice.webm`
   ids.push(await scalar("insert into interview_attempts(user_id,format,station_id,station_title,recording_path,recording_mime_type,media_kind,upload_status,duration_seconds,transcription_status,transcript,marking_preflight_at) values($1,'panel','panel-motivation','Motivation',$2,'audio/webm','audio','ready',60,'ready','A synthetic answer for marking tests.',now()) returning id",[user,path]) as string)
   await db.query("insert into storage.objects(bucket_id,name,metadata) values('interview-recordings',$1,'{\"size\":1000}')",[path])
  }
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);await db.exec('set role authenticated')
  assert.equal(await scalar('select submit_interview_for_marking($1,1)',[ids[0]]),'whole_panel_required')
  await db.exec('reset role')
  assert.equal(await scalar('select mmi_credits from profiles where id=$1',[user]),2)
  await db.query("update interview_attempts set format='mmi' where id=any($1::uuid[])",[ids])
  await db.exec('set role authenticated')
  const replies=await Promise.all(Array.from({length:5},()=>scalar('select submit_interview_for_marking($1,2)',[ids[0]])))
  assert.equal(replies.filter(r=>r==='submitted').length,1)
  assert.equal(replies.filter(r=>r==='already_submitted').length,4)
  assert.equal(await scalar('select submit_interview_for_marking($1,2)',[ids[1]]),'no_credits')
  await db.exec('reset role')
  assert.equal(await scalar('select mmi_credits from profiles where id=$1',[user]),0)
 }finally{await db.close()}
})

test('Stripe trial entitlements use restricted interviews; conversion to paid and concurrent paid access unlock the full bank',async()=>{
 const {loadModule}=await import('./helpers/load-module.mjs')
 let statuses=['trialing'],written:Array<{interview_trial_only:boolean;expires_at:string}>=[]
 const db={from(table:string){
  const result=()=>({data:table==='subscriptions'?statuses.map((status,i)=>({product_id:'product',stripe_subscription_id:`sub-${i}`,current_period_end:status==='active'?'2027-01-01':'2027-02-01',status})):table==='products'?[{id:'product',kind:'exam',exam_id:'interviews',stripe_product_id:'stripe-product'}]:[],error:null})
  const chain={select:()=>chain,eq:()=>chain,in:()=>chain,delete:()=>chain,maybeSingle:async()=>({data:{id:'interviews'},error:null}),insert:async(rows:typeof written)=>{written=rows;return {error:null}},then:(resolve:(r:unknown)=>void)=>Promise.resolve(result()).then(resolve)}
  return chain
 }}
 const sync=loadModule('src/lib/access/sync.ts',{'@/lib/supabase/admin':{createAdminClient:()=>db},'./../stripe/client':{},'@/lib/stripe/client':{getStripe:()=>({subscriptions:{retrieve:async()=>({items:{data:[{price:{product:'stripe-product',recurring:{interval:'month'}}}]}})}})}}) as typeof import('../src/lib/access/sync')
 await sync.syncEntitlementsForUser('student');assert.equal(written[0].interview_trial_only,true)
 statuses=['active'];await sync.syncEntitlementsForUser('student');assert.equal(written[0].interview_trial_only,false)
 statuses=['active','trialing'];await sync.syncEntitlementsForUser('student');assert.equal(written[0].interview_trial_only,false);assert.equal(written[0].expires_at,'2027-01-01')
 statuses=['trialing','active'];await sync.syncEntitlementsForUser('student');assert.equal(written[0].interview_trial_only,false)
})


test('trial dashboard recommends available questions while paid suggestions keep the complete bank',async()=>{
 const {suggestPractice}=await import('../src/lib/interviews/practice-progress')
 const suggestions=suggestPractice([], '2026-09-08', [...TRIAL_MMI_IDS,...TRIAL_PANEL_IDS])
 assert.equal(suggestions.length,3)
 assert.ok(suggestions.every(s=>trialQuestionAllowed(s.stationId,0)))
 assert.ok(suggestPractice([], '2026-09-08').some(s=>!trialQuestionAllowed(s.stationId,0)))
})
