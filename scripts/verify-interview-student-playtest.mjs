// Explicit operator-run integration checks. Never run as part of lint/build/CI.
// Credentials, passwords, cookies and signed URLs remain in process memory.
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { randomUUID, randomBytes, createHash } from 'node:crypto'
import { writeFileSync, mkdirSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

if (!process.argv.includes('--authorised-public-beta-test')) throw new Error('Explicit operator authorisation required')
const PROJECT='ghxwyfiemvyhijpmrhgf', SUPABASE_URL=`https://${PROJECT}.supabase.co`
const APP=process.argv.find(a=>a.startsWith('https://')), BUCKET='interview-recordings'
if(!APP||!new URL(APP).hostname.endsWith('.vercel.app'))throw new Error('Supply the beta deployment URL')
const CLI='/Users/patrick/.npm/_npx/aa8e5c70f9d8d161/node_modules/.bin/supabase'
const run=randomUUID(), users=[], paths=new Set(), attempts=[], checks=[]
let admin, publicKey, failure, failedCheck='', phase='credential retrieval'
mkdirSync('.vercel',{recursive:true})
const receiptPath=`.vercel/interview-hosted-${run}.json`
function receipt(extra={}) { writeFileSync(receiptPath,JSON.stringify({run,checks,createdUserIds:users.map(u=>u.id),createdAttemptIds:attempts.map(a=>a.attemptId),...extra},null,2)+'\n',{mode:0o600}) }
function ok(condition,label){if(!condition){failedCheck=label;throw new Error(label)}}
function checked(label){checks.push(label);receipt();console.log(`PASS ${label}`)}
function data(result,label){if(result.error){failedCheck=`${label} (${result.error.code??result.error.status??'service_error'})`;throw new Error(failedCheck)};return result.data}
async function http(path,user,method='GET',body){
 const res=await fetch(APP+path,{method,redirect:'manual',headers:{...(user?{Cookie:user.cookie}:{}),'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(45000)})
 const text=await res.text();let result;try{result=JSON.parse(text)}catch{result=null}
 return {status:res.status,body:result,text,headers:res.headers}
}
async function makeUser(label,role='student'){
 const password=randomBytes(32).toString('base64url')+'!aA9'
 const email=`mock-test-${run}-${label}@example.invalid`
 const created=data(await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:'Disposable Mock Interview Test',hosted_test_run:run}}),'create disposable account').user
 const user={id:created.id,role};users.push(user);receipt()
 data(await admin.from('profiles').update({role,mmi_credits:3}).eq('id',user.id),'set fixture role and credits')
 const jar=new Map()
 const client=createServerClient(SUPABASE_URL,publicKey,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:items=>items.forEach(x=>jar.set(x.name,x.value))},auth:{autoRefreshToken:false}})
 const session=data(await client.auth.signInWithPassword({email,password}),'sign in fixture').session
 user.client=client;user.token=session.access_token;user.cookie=[...jar].map(([k,v])=>`${k}=${v}`).join('; ')
 return user
}
async function initiate(user,{audio=true}={}){
 const res=await http('/api/interviews/attempts/initiate',user,'POST',{format:'panel',stationId:'panel-motivation',videoType:'video/mp4',audioType:audio?'audio/mp4':''})
 ok(res.status===200,`initiate status ${res.status}`)
 const attempt={...res.body,userId:user.id};attempts.push(attempt);paths.add(attempt.videoPath);if(attempt.audioPath)paths.add(attempt.audioPath);receipt();return attempt
}
const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
// These are labelled transport fixtures, not playable video or camera-capture proof.
const fixture=Buffer.alloc(7*1024*1024,0x54)
fixture.write('SYNTHETIC HOSTED TRANSPORT TEST - NO STUDENT MEDIA\n')
async function tus(user,path,{resume=false,bytes=fixture}={}){
 const metadata={bucketName:BUCKET,objectName:path,contentType:'video/mp4',cacheControl:'0'}
 const headers={'authorization':`Bearer ${user.token}`,'Tus-Resumable':'1.0.0'}
 const first=bytes.subarray(0,Math.min(bytes.length,6*1024*1024))
 const start=await fetch(`https://${PROJECT}.storage.supabase.co/storage/v1/upload/resumable`,{method:'POST',headers:{...headers,'Upload-Length':String(bytes.length),'Upload-Metadata':Object.entries(metadata).map(([k,v])=>`${k} ${Buffer.from(v).toString('base64')}`).join(','),'Content-Type':'application/offset+octet-stream'},body:first,signal:AbortSignal.timeout(60000)})
 if(start.status!==201)return {status:start.status}
 const location=new URL(start.headers.get('location'),`https://${PROJECT}.storage.supabase.co`).href
 if(first.length<bytes.length){
  // A separate HEAD/PATCH request resumes without retaining the first request.
  const head=await fetch(location,{method:'HEAD',headers,signal:AbortSignal.timeout(30000)})
  ok(head.status===200||head.status===204,`TUS HEAD ${head.status}`)
  const offset=Number(head.headers.get('upload-offset'));ok(offset===first.length,'TUS persisted exact offset')
  const patch=await fetch(location,{method:'PATCH',headers:{...headers,'Upload-Offset':String(offset),'Content-Type':'application/offset+octet-stream'},body:bytes.subarray(offset),signal:AbortSignal.timeout(60000)})
  ok(patch.status===204,`TUS resume ${patch.status}`)
  ok(Number(patch.headers.get('upload-offset'))===bytes.length,'TUS final offset')
  if(resume)checked('TUS resumes from persisted 6 MiB offset and completes 7 MiB transport fixture')
 }
 return {status:201,offset:Number(start.headers.get('upload-offset')),resourceHash:hash(location)}
}
async function row(id){return data(await admin.from('interview_attempts').select('*').eq('id',id).single(),'read fixture attempt')}
async function credits(user){return data(await admin.from('profiles').select('mmi_credits').eq('id',user.id).single(),'read fixture credits').mmi_credits}
async function finalise(user,a){return http(`/api/interviews/attempts/${a.attemptId}/finalise`,user,'POST',{durationSeconds:12,questionEvents:[{question_index:0,offset_seconds:0}]})}
async function clean(){
 const errors=[]
 if(!admin)return errors
 // Only IDs created by this invocation can be mutated by cleanup.
 for(const a of attempts){
  try{data(await admin.rpc('reserve_interview_deletion',{p_attempt_id:a.attemptId,p_user_id:a.userId}),'reserve fixture cleanup')}catch{/* An API deletion may have already removed it. */}
 }
 try{if(paths.size)data(await admin.storage.from(BUCKET).remove([...paths]),'remove fixture objects')}catch{errors.push('fixture object removal')}
 for(const a of attempts){try{data(await admin.from('interview_attempts').delete().eq('id',a.attemptId).eq('user_id',a.userId),'delete fixture row')}catch{errors.push('fixture row removal')}}
 for(const u of users){if(u.deleted)continue;try{data(await admin.from('interview_resource_usage').delete().eq('user_id',u.id),'remove fixture quota receipts');data(await admin.auth.admin.deleteUser(u.id),'delete disposable account')}catch{errors.push('disposable account removal')}}
 for(const a of attempts){
  for(const table of ['interview_attempts','interview_markings','interview_processing_jobs','interview_marking_events']){
   try{const res=await admin.from(table).select('id',{count:'exact',head:true}).eq(table==='interview_attempts'?'id':'attempt_id',a.attemptId);data(res,'verify fixture cascade');if(res.count!==0)errors.push('fixture cascade incomplete')}catch{errors.push('fixture cascade verification')}
  }
 }
 return errors
}




try{
 const {stdout}=await promisify(execFile)(CLI,['projects','api-keys','--project-ref',PROJECT,'--reveal','--output','json'],{maxBuffer:1048576,timeout:60000})
 const keys=JSON.parse(stdout);publicKey=keys.find(k=>k.type==='publishable')?.api_key
 admin=createClient(SUPABASE_URL,keys.find(k=>k.type==='secret').api_key,{auth:{persistSession:false,autoRefreshToken:false}})
 phase='credits display';const a=await makeUser('a'),b=await makeUser('b')
 for(const balance of [20,0]){
  data(await admin.from('profiles').update({mmi_credits:balance}).eq('id',a.id),'fixture balance')
  const lobby=await http('/interviews/mock-interviews',a)
  ok(lobby.status===200&&lobby.text.includes(`${balance} credits available`),'current credit balance rendered')
 }
 checked('Mock lobby accurately renders positive and zero interview credit balances')
 phase='resumable upload';const first=await initiate(a,{audio:false})
 ok((await finalise(a,first)).status===409,'missing media cannot finalise')
 ok((await tus(b,first.videoPath,{bytes:fixture.subarray(0,256)})).status!==201,'cross-owner upload denied')
 ok((await tus(a,first.videoPath,{resume:true})).status===201,'resumed upload')
 const saved=data(await a.client.storage.from(BUCKET).download(first.videoPath),'owner download')
 ok(hash(Buffer.from(await saved.arrayBuffer()))===hash(fixture),'uploaded bytes match')
 ok(!!(await b.client.storage.from(BUCKET).download(first.videoPath)).error,'private download')
 checked('Resumed recording bytes match exactly and are private to the owner')
 phase='finalisation and insufficient credits'
 const finals=await Promise.all([finalise(a,first),finalise(a,first)])
 ok(finals.every(r=>r.status===200),'idempotent finalisation')
 const ready=await row(first.attemptId)
 ok(ready.upload_status==='ready'&&ready.transcription_status==='failed'&&ready.credits_spent===0,'missing audio preserves video without charge')
 const submission=await http(`/api/interviews/attempts/${first.attemptId}/submit-marking`,a,'POST',{expectedCredits:1})
 ok(submission.status===409,'zero credit submission denied')
 ok(await credits(a)===0&&(await row(first.attemptId)).marking_status===null,'no charge or queue')
 checked('Repeated finalisation is safe; missing audio preserves video; insufficient credits prevent marking without a charge')
 phase='50-response library';const ids=Array.from({length:49},()=>randomUUID())
 for(const id of ids)attempts.push({attemptId:id,userId:a.id})
 // Only synthetic fixtures are backdated. Live quotas and existing student data are unchanged.
 for(let index=0;index<ids.length;index++){
  const id=ids[index],created_at=new Date(Date.now()-(index+1)*86400000).toISOString()
  data(await admin.from('interview_resource_usage').update({created_at:'2026-01-01T00:00:00Z'}).eq('user_id',a.id),'age fixture quota receipts')
  data(await admin.from('interview_attempts').insert({id,user_id:a.id,created_at,format:index%2?'mmi':'panel',station_id:index%2?'mmi-resource-choice':'panel-motivation',station_title:`Synthetic library response ${String(index+1).padStart(2,'0')}`,duration_seconds:90,questions:['PRIVATE_PLAYTEST_PROMPT'],recording_path:`${a.id}/${id}/synthetic.webm`,recording_mime_type:'audio/webm',media_kind:'audio',upload_status:'ready',transcript:'PRIVATE_PLAYTEST_TRANSCRIPT'}),'seed historical synthetic library')
 }
 const library=await http('/interviews/mock-interviews/review',a)
 ok(library.status===200&&/50(?:<!-- -->)? saved/.test(library.text),'50 response count')
 ok(!library.text.includes('PRIVATE_PLAYTEST_TRANSCRIPT')&&!library.text.includes('/storage/v1/object/sign/'),'metadata-only library')
 const fifth=await http('/interviews/mock-interviews/review?page=5',a)
 ok(fifth.status===200&&/Page (?:<!-- -->)?5/.test(fifth.text),'page five')
 const filtered=await http('/interviews/mock-interviews/review?q=Synthetic%20library%20response%2001',a)
 ok(filtered.status===200&&filtered.text.includes('Synthetic library response 01'),'search filter')
 ok(!(await http('/interviews/mock-interviews/review',b)).text.includes('Synthetic library response'),'other owner isolation')
 checked('50-response library paginates and searches without loading transcripts or exposing another student’s responses')
 phase='playback access and deletion'
 const media=await http(`/api/interviews/attempts/${first.attemptId}/media`,a)
 ok(media.status===200&&media.body.url,'signed playback link')
 const payload=await fetch(media.body.url);ok(payload.status===200&&hash(Buffer.from(await payload.arrayBuffer()))===hash(fixture),'signed bytes match')
 ok((await http(`/api/interviews/attempts/${first.attemptId}`,a,'DELETE')).status===200,'delete fixture via student API')
 const deleted=await fetch(media.body.url);ok([400,404].includes(deleted.status),'signed playback revoked')
 checked('Signed playback serves the stored bytes and stops working after the owner deletes the attempt')
}catch{failure=`Failed at ${phase}${failedCheck?`: ${failedCheck}`:''}; service responses and credentials omitted`;console.error(failure)}
finally{const errors=await clean();if(errors.length){failure=failure??'Fixture cleanup failed';console.error(errors.join(', '))}else if(admin)checked('All disposable transport accounts, recording rows and stored objects removed');receipt({app:APP,passed:!failure,failure});console.log(`Receipt: ${receiptPath}`)}
if(failure)process.exitCode=1
