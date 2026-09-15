// Explicit operator-run integration checks. Never run as part of lint/build/CI.
// Credentials, passwords, cookies and signed URLs remain in process memory.
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { randomUUID, randomBytes, createHash } from 'node:crypto'
import { writeFileSync, mkdirSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { Upload } from 'tus-js-client'
import { loadModule } from '../tests/helpers/load-module.mjs'

if (!process.argv.includes('--authorised-public-beta-test')) throw new Error('Explicit operator authorisation required')
const PROJECT='ghxwyfiemvyhijpmrhgf', SUPABASE_URL=`https://${PROJECT}.supabase.co`
const APP='https://emedibank-x1uw.vercel.app', BUCKET='interview-recordings'
const CLI='/Users/patrick/.npm/_npx/aa8e5c70f9d8d161/node_modules/.bin/supabase'
const run=randomUUID(), users=[], paths=new Set(), attempts=[], checks=[]
let admin, publicKey, before, failure, phase='credential retrieval'
mkdirSync('.vercel',{recursive:true})
const receiptPath=`.vercel/interview-hosted-${run}.json`
function receipt(extra={}) { writeFileSync(receiptPath,JSON.stringify({run,checks,createdUserIds:users.map(u=>u.id),createdAttemptIds:attempts.map(a=>a.attemptId),...extra},null,2)+'\n',{mode:0o600}) }
function ok(condition,label){if(!condition)throw new Error(label)}
function checked(label){checks.push(label);receipt();console.log(`PASS ${label}`)}
function data(result,label){if(result.error)throw new Error(`${label} (${result.error.code??result.error.status??'service_error'})`);return result.data}
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
async function submit(user,a){return http(`/api/interviews/attempts/${a.attemptId}/submit-marking`,user,'POST',{})}
async function review(a,reviewer,{version=0,watched=true,action='approve'}={}){
 return data(await admin.rpc('review_interview_marking',{p_attempt_id:a.attemptId,p_actor_id:reviewer.id,p_version:version,p_action:action,p_feedback:feedback,p_notes:'SYNTHETIC PRIVATE TEST NOTES',p_corrections:'SYNTHETIC PRIVATE TEST CORRECTIONS',p_watched:watched}),'review fixture')
}
const feedback={overall:{score:4,band:'Developing response',summary:'Synthetic database acceptance fixture.'},domains:[{key:'communication',label:'Communication',applicable:true,score:4,evidence:['Synthetic test evidence'],comment:'Synthetic test comment'}],strengths:['Synthetic strength'],priorities:['Synthetic priority'],practice_task:'Synthetic next task',reviewer_note:'Reviewed and approved by an EMeducate reviewer.'}
async function noPrivateAccess(user,a){
 for(const table of ['interview_markings','interview_processing_jobs','interview_marking_events']){
  const res=await user.client.from(table).select('*').eq('attempt_id',a.attemptId);ok(!!res.error||res.data.length===0,`${table} private`)
 }
 const rpc=await user.client.rpc('claim_next_interview_job',{p_worker:'untrusted-fixture'});ok(!!rpc.error,'student worker RPC denied')
}
async function clean(){
 const errors=[]
 if(!admin)return errors
 // Only IDs created by this invocation can be mutated by cleanup.
 for(const a of attempts){
  try{data(await admin.rpc('reserve_interview_deletion',{p_attempt_id:a.attemptId,p_user_id:a.userId}),'reserve fixture cleanup')}catch{/* An API deletion may have already removed it. */}
 }
 try{if(paths.size)data(await admin.storage.from(BUCKET).remove([...paths]),'remove fixture objects')}catch{errors.push('fixture object removal')}
 for(const a of attempts){try{data(await admin.from('interview_attempts').delete().eq('id',a.attemptId).eq('user_id',a.userId),'delete fixture row')}catch{errors.push('fixture row removal')}}
 for(const u of users){if(u.deleted)continue;try{data(await admin.auth.admin.deleteUser(u.id),'delete disposable account')}catch{errors.push('disposable account removal')}}
 for(const a of attempts){
  for(const table of ['interview_attempts','interview_markings','interview_processing_jobs','interview_marking_events']){
   try{const res=await admin.from(table).select('id',{count:'exact',head:true}).eq(table==='interview_attempts'?'id':'attempt_id',a.attemptId);data(res,'verify fixture cascade');if(res.count!==0)errors.push('fixture cascade incomplete')}catch{errors.push('fixture cascade verification')}
  }
 }
 return errors
}



async function clientTus(user,path,bytes){
 return new Promise(resolve=>{
  const upload=new Upload(bytes,{
   endpoint:`https://${PROJECT}.storage.supabase.co/storage/v1/upload/resumable`,chunkSize:6*1024*1024,
   retryDelays:null,uploadDataDuringCreation:true,removeFingerprintOnSuccess:true,
   headers:{authorization:`Bearer ${user.token}`},
   metadata:{bucketName:BUCKET,objectName:path,contentType:'video/mp4',cacheControl:'0'},
   onError:error=>resolve({status:error.originalResponse?.getStatus?.()??0}),
   onSuccess:({lastResponse})=>resolve({status:lastResponse.getStatus(),offset:Number(lastResponse.getHeader('Upload-Offset')),resourceHash:hash(upload.url)}),
  })
  upload.start()
 })
}

async function mediaChecks(){
 phase='concurrent immutable uploads'
 const student=await makeUser('media'),a=await initiate(student,{audio:false})
 const payloads=[Buffer.alloc(1024,0x41),Buffer.alloc(1024,0x42)]
 const send=bytes=>process.argv.includes('--actual-tus-client')?clientTus(student,a.videoPath,bytes):tus(student,a.videoPath,{bytes})
 const uploads=await Promise.all(payloads.map(send))
 console.log('Concurrent upload observations: '+JSON.stringify({statuses:uploads.map(x=>x.status),offsets:uploads.map(x=>x.offset),sameUploadResource:uploads[0].resourceHash===uploads[1].resourceHash}))
 const uniqueWinner=uploads.filter(x=>x.status===201).length===1
 if(!uniqueWinner){failure='Concurrent TUS creation returned success for both requests; completion semantics require investigation'}
 const downloaded=data(await student.client.storage.from(BUCKET).download(a.videoPath),'concurrent upload result')
 const savedHash=hash(Buffer.from(await downloaded.arrayBuffer()))
 const winner=payloads.findIndex(bytes=>hash(bytes)===savedHash)
 ok(winner>=0,'stored content matches one submitted payload')
 if(uniqueWinner)checked('Concurrent TUS uploads to the same path have exactly one winner and preserve its bytes')
 else checked('Concurrent creation produced one readable object matching one original payload')
 phase='signed playback access and revocation'
 ok((await finalise(student,a)).status===200,'signed media finalise')
 const media=await http(`/api/interviews/attempts/${a.attemptId}/media`,student)
 ok(media.status===200&&media.body.url,'signed media API succeeds')
 ok(media.headers.get('cache-control')?.includes('no-store'),'signed media API is not cached')
 ok((await tus(student,a.videoPath,{bytes:Buffer.alloc(1024,0x43)})).status!==201,'finalised recording cannot be overwritten')
 checked('Finalised recording rejects a new upload to the same path')
 const url=media.body.url
 const before=await fetch(url,{signal:AbortSignal.timeout(30000)})
 ok(before.status===200&&hash(Buffer.from(await before.arrayBuffer()))===hash(payloads[winner]),'signed download retrieves original bytes')
 ok((await http(`/api/interviews/attempts/${a.attemptId}`,student,'DELETE')).status===200,'signed fixture deletion succeeds')
 const after=await fetch(url,{signal:AbortSignal.timeout(30000)})
 ok(after.status===400||after.status===404,'deleted signed media unavailable')
 checked('Signed download serves owner bytes; deleting the attempt revokes the previously issued URL')
}

async function recoveryChecks(){
 phase='recovery fixtures'
 const student=await makeUser('recovery'),reviewer=await makeUser('reviewer','admin')
 const a=await initiate(student),unfinished=await initiate(student,{audio:false})
 ok((await tus(student,a.videoPath,{bytes:fixture.subarray(0,512)})).status===201,'recovery primary upload')
 ok((await finalise(student,a)).status===200,'recovery finalise')
 const bucket=admin.storage.from(BUCKET)
 data(await bucket.upload(a.audioPath,fixture.subarray(0,256),{contentType:'audio/mp4'}),'fixture audio copy')
 const orphan=`${student.id}/${a.attemptId}/nested/partial.mp4`;paths.add(orphan)
 data(await bucket.upload(orphan,fixture.subarray(0,256),{contentType:'video/mp4'}),'fixture nested residual object')
 data(await bucket.upload(unfinished.videoPath,fixture.subarray(0,256),{contentType:'video/mp4'}),'fixture unfinished object')
 const oldId=randomUUID(),oldPath=`${student.id}/${oldId}/response.mp3`
 const old={attemptId:oldId,userId:student.id,videoPath:oldPath};attempts.push(old);paths.add(oldPath);receipt()
 data(await admin.from('interview_attempts').insert({id:oldId,user_id:student.id,format:'panel',station_id:'panel-motivation',station_title:'Synthetic historical audio fixture',recording_path:oldPath,recording_mime_type:'audio/mpeg',duration_seconds:12}),'historical audio fixture row')
 data(await bucket.upload(oldPath,fixture.subarray(0,256),{contentType:'audio/mpeg'}),'historical audio fixture upload')
 data(await admin.from('interview_attempts').update({transcript:'Synthetic failure recovery transcript.',transcription_status:'ready'}).eq('id',a.attemptId),'recovery transcript')
 ok((await submit(student,a)).status===200,'recovery submission')
 const job=data(await admin.from('interview_processing_jobs').select('id').eq('attempt_id',a.attemptId).eq('job_type','assess').single(),'recovery job')
 const worker=`synthetic-${run}`
 data(await admin.from('interview_processing_jobs').update({status:'running',locked_by:worker,locked_at:new Date().toISOString(),attempt_count:5,available_at:'2099-01-01T00:00:00Z'}).eq('id',job.id),'fixture lease')
 ok(data(await admin.rpc('complete_interview_job',{p_job_id:job.id,p_worker:'wrong-owner',p_payload:{}}),'wrong-owner completion')===false,'stale completion refused')
 ok(data(await admin.rpc('fail_interview_job',{p_job_id:job.id,p_worker:'wrong-owner',p_code:'synthetic',p_delay:3600}),'wrong-owner failure')===false,'stale failure refused')
 ok(data(await admin.rpc('fail_interview_job',{p_job_id:job.id,p_worker:worker,p_code:'synthetic_timeout',p_delay:3600}),'terminal failure')===true,'owned terminal failure accepted')
 const failed=await row(a.attemptId);ok(failed.marking_status==='needs_attention'&&failed.approved_feedback===null,'terminal failure does not release')
 checked('Hosted job completion/failure rejects the wrong lease owner; exhausted failure needs attention without publishing feedback')
 phase='rolled-back retention'
 // Global retention only changes SQL rows inside this transaction; rollback makes
 // those changes invisible to live workers and no storage deletion is invoked.
 const sql=`begin; set local lock_timeout='5s'; set local statement_timeout='15s';
 update public.interview_attempts set created_at=now()-interval '100 days' where id in ('${a.attemptId}','${unfinished.attemptId}','${oldId}');
 select public.enqueue_interview_retention(90);
 do $$ begin
 if not exists(select 1 from public.interview_attempts where id='${a.attemptId}' and upload_status='ready' and marking_status='needs_attention' and video_deleted_at is null) then raise exception 'Pending review was not protected'; end if;
 if not exists(select 1 from public.interview_attempts where id='${oldId}' and upload_status='ready' and media_kind='audio') then raise exception 'Historical audio was not protected'; end if;
 if not exists(select 1 from public.interview_attempts where id='${unfinished.attemptId}' and upload_status='discarded') then raise exception 'Expired upload not reserved'; end if;
 if not exists(select 1 from public.interview_processing_jobs where attempt_id='${unfinished.attemptId}' and job_type='cleanup') then raise exception 'Cleanup not enqueued'; end if;
 end $$;
 rollback; select 'retention fixture assertions passed and rolled back' as result;`
 await promisify(execFile)(CLI,['db','query','--linked','--project-ref',PROJECT,'--output','json',sql],{maxBuffer:1024*1024,timeout:45000})
 ok((await row(unfinished.attemptId)).upload_status==='awaiting_upload','retention rollback restored fixture')
 checked('Hosted retention protects pending review and historical audio and reserves expired uploads; all SQL changes rolled back')
 phase='account deletion recovery'
 const root='.vercel/mock-interviews-public-release/'
 const storage=loadModule(root+'src/lib/interviews/storage-cleanup.ts',{'@/lib/supabase/admin':{createAdminClient:()=>admin}})
 let injectFailure=true
 const actions=loadModule(root+'src/lib/admin/student-actions.ts',{
  '@/lib/interviews/storage-cleanup':{removeInterviewObjects:async attempt=>{ok(attempt.user_id===student.id,'cleanup constrained to fixture');if(injectFailure)throw new Error('synthetic storage failure');return storage.removeInterviewObjects(attempt)}},
  'next/cache':{revalidatePath:()=>{}},
  '@/lib/auth/dal':{getProfile:async()=>({id:reviewer.id,role:'admin'})},
  '@/lib/auth/signup-protection':{normalisePhone:()=>{throw new Error('Unexpected signup call')}},
  '@/lib/site':{getOrigin:()=>APP},
  '@/lib/supabase/admin':{createAdminClient:()=>admin}
 },{console:{...console,error:()=>{}}})
 const account=data(await admin.auth.admin.getUserById(student.id),'fixture account verification').user
 const form=new FormData();form.set('userId',student.id);form.set('confirmationEmail',account.email)
 const refused=await actions.deleteManagedAccountAction({},form);ok(!!refused.error&&!refused.deleted,'failed storage cleanup preserves account')
 ok(data(await admin.auth.admin.getUserById(student.id),'retained fixture account').user.id===student.id,'account retained after storage failure')
 ok((await row(a.attemptId)).recording_path===a.videoPath,'recording pointers retained')
 injectFailure=false
 const deleted=await actions.deleteManagedAccountAction({},form);ok(deleted.deleted===true,'retry account deletion succeeds');student.deleted=true
 for(const path of [a.videoPath,a.audioPath,orphan,unfinished.videoPath,oldPath])ok(!!(await bucket.info(path)).error,'account object removed')
 for(const attempt of [a,unfinished,old])ok(data(await admin.from('interview_attempts').select('id').eq('id',attempt.attemptId),'account cascade').length===0,'account attempt cascaded')
 checked('Deployed account-deletion code preserves account/pointers on storage failure; retry removes video, audio, nested residual objects and all attempts')
}

try{
 const {stdout}=await promisify(execFile)(CLI,['projects','api-keys','--project-ref',PROJECT,'--reveal','--output','json'],{maxBuffer:1024*1024,timeout:60000})
 const keys=JSON.parse(stdout);const key=keys.find(k=>k.type==='secret')?.api_key
 publicKey=keys.find(k=>k.type==='publishable')?.api_key;ok(key&&publicKey,'required keys available')
 admin=createClient(SUPABASE_URL,key,{auth:{persistSession:false,autoRefreshToken:false}})
 before=data(await admin.from('interview_attempts').select('*').order('id'),'snapshot historical attempts')
 if(process.argv.includes('--recovery-only')) { await recoveryChecks() } else if(process.argv.includes('--media-only')) { await mediaChecks() } else {
 phase='fixture accounts';const a=await makeUser('a'),b=await makeUser('b'),reviewer=await makeUser('reviewer','admin'),tutor=await makeUser('tutor','tutor')
 checked('Four disposable accounts created without email; sessions and credentials remain in memory')
 phase='hosted authentication';ok((await http('/api/interviews/attempts/initiate',null,'POST',{})).status===401,'anonymous initiation denied')
 for(const user of [a,tutor]){
  const page=await http('/admin/interviews',user)
  const redirected=(page.status>=300&&page.status<400&&!!page.headers.get('location'))||(page.status===200&&page.text.includes('NEXT_REDIRECT')&&!/<h1\b[^>]*>Mock Interview reviews<\/h1>/.test(page.text))
  ok(redirected,`${user.role} admin queue denied (HTTP ${page.status}, streamed redirect ${page.text.includes('NEXT_REDIRECT')})`)
 }
 checked('Anonymous initiation and student/general-tutor admin-queue access denied')
 phase='upload preparation';const first=await initiate(a)
 ok((await finalise(a,first)).status===409,'missing video cannot finalise')
 ok((await tus(b,first.videoPath,{bytes:fixture.subarray(0,256)})).status!==201,'other student cannot upload owner path')
 ok((await tus(a,first.videoPath,{resume:true})).status===201,'owner TUS upload succeeds')
 const saved=data(await a.client.storage.from(BUCKET).download(first.videoPath),'owner object download');ok(hash(Buffer.from(await saved.arrayBuffer()))===hash(fixture),'uploaded bytes match')
 checked('Owner private download matches original bytes; other student upload denied')
 phase='private storage';const otherRead=await b.client.storage.from(BUCKET).download(first.videoPath);ok(!!otherRead.error,'other student download denied')
 const anon=createClient(SUPABASE_URL,publicKey,{auth:{persistSession:false,autoRefreshToken:false}});ok(!!(await anon.storage.from(BUCKET).download(first.videoPath)).error,'anonymous object read denied')
 ok((await tus(a,first.videoPath,{bytes:fixture.subarray(0,256)})).status!==201,'non-upsert immutable path')
 checked('Anonymous/other-student downloads and duplicate immutable-path uploads denied')
 phase='finalise without audio';const finals=await Promise.all([finalise(a,first),finalise(a,first)]);ok(finals.every(x=>x.status===200),'repeat finalise succeeds')
 const ready=await row(first.attemptId);ok(ready.upload_status==='ready'&&ready.transcription_status==='failed'&&ready.credits_spent===0,'video survives missing audio without charge')
 ok(await credits(a)===3,'self review credit unchanged');ok((await http(`/api/interviews/attempts/${first.attemptId}/media`,a)).status===200,'owner signed media')
 ok((await http(`/api/interviews/attempts/${first.attemptId}/media`,b)).status===404,'other student media API denied')
 ok((await http(`/api/interviews/attempts/${first.attemptId}`,b,'DELETE')).status===404,'other student deletion denied')
 ok(data(await b.client.from('interview_attempts').select('id').eq('id',first.attemptId),'other student attempt query').length===0,'attempt RLS')
 checked('Concurrent finalise is idempotent; missing audio preserves video; self-review is free; ownership enforced')
 phase='credit protection';ok(!!(await a.client.from('profiles').update({mmi_credits:100}).eq('id',a.id)).error,'student credit update denied')
 ok(!!(await a.client.from('interview_attempts').update({marking_status:'released'}).eq('id',first.attemptId)).error,'student release update denied')
 // Synthetic transcript avoids provider calls. Future availability fences only this fixture's jobs.
 data(await admin.from('interview_attempts').update({transcript:'Synthetic transcript for database checks; this is not a student response.',transcription_status:'ready'}).eq('id',first.attemptId),'seed synthetic transcript')
 const submits=await Promise.all([submit(a,first),submit(a,first)]);ok(submits.every(r=>r.status===200),'concurrent submit HTTP success')
 ok(submits.filter(r=>r.body.status==='submitted').length===1,'one submission');ok(await credits(a)===2,'one credit spent')
 data(await admin.from('interview_processing_jobs').update({available_at:'2099-01-01T00:00:00Z'}).eq('attempt_id',first.attemptId),'fence fixture provider jobs')
 await noPrivateAccess(a,first);await noPrivateAccess(b,first);await noPrivateAccess(tutor,first)
 const privateMark=data(await admin.from('interview_markings').select('*').eq('attempt_id',first.attemptId).single(),'fixture working record')
 ok((await row(first.attemptId)).approved_feedback===null,'no feedback before release')
 checked('Independent concurrent HTTP submissions charge once; private drafts/jobs/events and direct credit/release writes denied')
 phase='approval concurrency';ok(await review(first,reviewer,{watched:false})==='invalid_feedback','acknowledgement required')
 ok(await review(first,reviewer,{version:999})==='conflict','stale review version rejected')
 const releases=await Promise.all([review(first,reviewer),review(first,reviewer)]);ok(releases.filter(x=>x==='released').length===1&&releases.includes('already_released'),'one release')
 const published=data(await a.client.from('interview_attempts').select('approved_feedback,marking_status').eq('id',first.attemptId).single(),'student released feedback')
 ok(published.marking_status==='released'&&published.approved_feedback.overall.summary===feedback.overall.summary,'approved feedback published')
 ok(!JSON.stringify(published).includes('PRIVATE TEST'),'private notes excluded')
 const recorded=data(await admin.from('interview_markings').select('marked_by,approved_at').eq('id',privateMark.id).single(),'review audit identity');ok(recorded.marked_by===reviewer.id&&recorded.approved_at,'reviewer identity stored')
 checked('Manual approval requires acknowledgement/version; concurrent approval releases once; only approved feedback is public')
 phase='refund concurrency';const second=await initiate(a,{audio:false});ok((await tus(a,second.videoPath,{bytes:fixture.subarray(0,512)})).status===201,'second upload')
 ok((await finalise(a,second)).status===200,'second finalise')
 data(await admin.from('interview_attempts').update({transcript:'Synthetic refund test transcript.',transcription_status:'ready'}).eq('id',second.attemptId),'seed refund transcript')
 ok((await submit(a,second)).status===200,'refund fixture submit')
 data(await admin.from('interview_processing_jobs').update({available_at:'2099-01-01T00:00:00Z'}).eq('attempt_id',second.attemptId),'fence refund jobs')
 const refund=()=>admin.rpc('refund_interview_marking',{p_attempt_id:second.attemptId,p_actor_id:reviewer.id,p_reason:'Synthetic test cleanup: no student work.'})
 const refunds=(await Promise.all([refund(),refund()])).map(x=>data(x,'refund RPC'));ok(refunds.filter(x=>x==='refunded').length===1&&refunds.includes('already_refunded'),'refund once')
 ok(await credits(a)===2,'exact refund balance');ok(await review(second,reviewer)==='not_eligible','refunded cannot release')
 checked('Independent concurrent refunds return one credit once; refunded submission cannot release')
 phase='attempt deletion';ok((await http(`/api/interviews/attempts/${first.attemptId}`,a,'DELETE')).status===200,'owner delete API succeeds')
 ok(!!(await admin.storage.from(BUCKET).info(first.videoPath)).error,'deleted storage absent')
 for(const table of ['interview_markings','interview_processing_jobs','interview_marking_events'])ok(data(await admin.from(table).select('id').eq('attempt_id',first.attemptId),'cascade check').length===0,'attempt dependency cascade')
 checked('Owner attempt-deletion API removes storage and cascades private records/jobs/events')
 }
}catch(error){failure=`${phase}: ${error instanceof Error?error.message:'unexpected failure'}`;console.log(`FAIL ${failure}`)}
finally{
 phase='cleanup';const cleanupErrors=await clean()
 if(admin&&before){try{const after=data(await admin.from('interview_attempts').select('*').in('id',before.map(x=>x.id)).order('id'),'verify historical snapshot');ok(hash(JSON.stringify(before))===hash(JSON.stringify(after)),'historical attempts unchanged');checked('Original attempts unchanged after hosted tests')}catch{cleanupErrors.push('historical preservation verification')}}
 if(cleanupErrors.length)console.log('CLEANUP ATTENTION '+cleanupErrors.join(', '));else console.log('PASS All disposable accounts, attempts and uploaded objects removed')
 receipt({completedAt:new Date().toISOString(),failure:failure??null,cleanupErrors,scope:'Synthetic transport/API/RLS/credit/refund/manual-approval tests; no camera, playback, AI provider, global worker or global retention proof.'})
 console.log(`Receipt: ${receiptPath}`);if(failure||cleanupErrors.length)process.exitCode=1
}
