import { test } from 'node:test'
import assert from 'node:assert/strict'
import Module,{ createRequire } from 'node:module'
import { resolve } from 'node:path'
const require=createRequire(import.meta.url)
// Node 22.15+/24 test hook; application types intentionally still target Node 20.
type ResolveHook=(specifier:string,context:object,next:(specifier:string,context:object)=>object)=>object
const {registerHooks}=require('node:module') as {registerHooks:(hooks:{resolve:ResolveHook})=>void}
registerHooks({resolve(specifier,context,next){if(specifier==='server-only')return next(resolve('tests/helpers/server-only.cjs'),context);return next(specifier,context)}})
let user:{id:string}|null=null,admin=false,attempt:Record<string,unknown>|null=null,media=true,audio=true,inserted:Record<string,unknown>|null=null,rpcResult:unknown='submitted'
let rpcHandler:((name:string,args:Record<string,unknown>)=>unknown)|null=null
let privateMarking:unknown=null
let insertError:{message:string}|null=null
const operations:string[]=[]
const calls:Array<{name:string;args:Record<string,unknown>}> = []
function query(table:string){
 const filters:Record<string,unknown>={}
 const result=()=>({data:table==='interview_attempts'?(attempt&&(!filters.user_id||attempt.user_id===filters.user_id)?attempt:null):table==='interview_markings'?privateMarking:null,error:null,count:0})
 const chain={select:()=>chain,eq:(k:string,v:unknown)=>{filters[k]=v;return chain},in:()=>chain,is:()=>chain,gte:()=>chain,order:()=>chain,limit:()=>chain,neq:()=>chain,
 insert:async(value:Record<string,unknown>)=>{inserted=value;return {error:insertError}},
 update:()=>chain,maybeSingle:async()=>result(),single:async()=>result(),then:(resolve:(value:unknown)=>void)=>Promise.resolve(result()).then(resolve)}
 return chain
}
const db={from:query,rpc:async(name:string,args:Record<string,unknown>)=>{calls.push({name,args});operations.push(name);return {data:rpcHandler?rpcHandler(name,args):rpcResult,error:null}},storage:{from:()=>({download:async()=>({data:new Blob(['synthetic audio'],{type:'audio/webm'}),error:null}),remove:async()=>{operations.push('storage_remove');return {error:null}},info:async(path:string)=>({data:(path.includes('transcription')?audio:media)?{contentType:path.includes('transcription')?'audio/webm':'video/webm',size:10000}:null,error:(path.includes('transcription')?audio:media)?null:{message:'missing'}})})}}
function mock(path:string,exports:Record<string,unknown>){const id=require.resolve(path),m=new Module(id);m.filename=id;m.loaded=true;m.exports=exports;require.cache[id]=m}
mock('../src/lib/auth/dal.ts',{getUser:async()=>user,requireAdmin:async()=>{if(!admin)throw new Error('admin required');return {id:'admin'}},getProfile:async()=>admin?{role:'admin'}:null})
mock('../src/lib/supabase/admin.ts',{createAdminClient:()=>db})
mock('../src/lib/supabase/server.ts',{createClient:async()=>db})
mock('next/cache',{revalidatePath:()=>{}})
const initiate=require('../src/app/api/interviews/attempts/initiate/route.ts') as {POST:(r:Request)=>Promise<Response>}
const finalise=require('../src/app/api/interviews/attempts/[attemptId]/finalise/route.ts') as {POST:(r:Request,c:unknown)=>Promise<Response>}
const submit=require('../src/app/api/interviews/attempts/[attemptId]/submit-marking/route.ts') as typeof finalise
const transcript=require('../src/app/api/interviews/attempts/[attemptId]/transcript/route.ts') as typeof finalise
const worker=require('../src/app/api/internal/interviews/process/route.ts') as {GET:(r:Request)=>Promise<Response>}
const actions=require('../src/lib/interviews/marking-actions.ts') as {reviewInterviewAction:(id:string,version:number,action:string,feedback:unknown,notes:string,corrections:string,watched:boolean)=>Promise<{ok:boolean}>}
function request(body:unknown={}){return new Request('http://localhost/api',{method:'POST',body:JSON.stringify(body),headers:{'Content-Type':'application/json'}})}
const ctx={params:Promise.resolve({attemptId:'attempt'})}
test('API authentication, canonical initiate, partial uploads, duplicates, no credits and manual marking',async()=>{
 process.env.INTERVIEW_VIDEO_MARKING_ENABLED='true'
 for(const handler of [finalise.POST,submit.POST,transcript.POST])assert.equal((await handler(request(),ctx)).status,401)
 assert.equal((await initiate.POST(request())).status,401)
 assert.equal((await worker.GET(new Request('http://localhost/worker'))).status,401)
 user={id:'student-a'}
 const res=await initiate.POST(request({format:'mmi',stationId:'mmi-confidentiality-patient-safety',videoType:'video/webm',audioType:'audio/webm',station_snapshot:{title:'Forged'}}))
 assert.equal(res.status,200);assert.notEqual((inserted!.station_snapshot as {title:string}).title,'Forged')
 for(const message of ['recording_daily_limit','recording_storage_limit']){
 insertError={message}
 assert.equal((await initiate.POST(request({format:'mmi',stationId:'mmi-confidentiality-patient-safety',videoType:'video/webm'}))).status,429)
 }
 insertError=null
 assert.equal((await initiate.POST(request({format:'mmi',stationId:'fake',videoType:'video/webm'}))).status,503)
 attempt={id:'attempt',user_id:'student-b',upload_status:'awaiting_upload',format:'mmi',recording_path:'response.webm',transcription_audio_path:'transcription.webm',recording_mime_type:'video/webm',questions:['Q'],marking_status:null}
 assert.equal((await finalise.POST(request(),ctx)).status,404)
 attempt.user_id='student-a';rpcResult=true;media=false
 const finalBody={durationSeconds:90,questionEvents:[{question_index:0,offset_seconds:0}]}
 assert.equal((await finalise.POST(request(finalBody),ctx)).status,409)
 media=true;audio=false
 assert.equal((await finalise.POST(request(finalBody),ctx)).status,200)
 assert.equal(calls.at(-1)!.args.p_has_audio,false)
 attempt.upload_status='ready';const count=calls.length
 assert.equal((await finalise.POST(request(),ctx)).status,200);assert.equal(calls.length,count)
 rpcResult='no_credits';assert.equal((await submit.POST(request({expectedCredits:2}),ctx)).status,409)
 const rpcBefore=calls.length;assert.equal((await submit.POST(request({expectedCredits:1}),ctx)).status,409);assert.equal(calls.length,rpcBefore)
 attempt.marking_status='queued';assert.equal((await submit.POST(request(),ctx)).status,200)
 attempt.transcription_status='ready';attempt.transcript='Already persisted';assert.equal((await (await transcript.POST(request(),ctx)).json()).transcript,'Already persisted')
 attempt.transcription_status='failed';rpcResult='queued';assert.equal((await (await transcript.POST(request(),ctx)).json()).status,'processing')
 await assert.rejects(actions.reviewInterviewAction('attempt',0,'approve',{},'','',true))
 admin=true;attempt.format='mmi'
 const f={overall:{score:4,band:'Developing response',summary:'Clear answer'},domains:[{key:'communication',label:'Communication',applicable:true,score:4,evidence:['States a position'],comment:'Develop the reasons'}],strengths:['Clear position'],priorities:['Add support'],practice_task:'Answer again with two reasons',reviewer_note:'Reviewed and approved by an EMeducate reviewer.'}
 assert.equal((await actions.reviewInterviewAction('attempt',0,'approve',f,'private note','correction',false)).ok,false)
 rpcResult='released';assert.equal((await actions.reviewInterviewAction('attempt',0,'approve',f,'private note','correction',true)).ok,true)
 const release=calls.findLast(c=>c.name==='review_interview_marking')!
 assert.deepEqual(release.args.p_feedback,f);assert.equal((release.args.p_feedback as Record<string,unknown>).private_reviewer_notes,undefined)
 rpcResult='already_released';assert.equal((await actions.reviewInterviewAction('attempt',0,'approve',f,'','',true)).ok,true)
})

test('durable worker: missing configuration, transcript persistence before audio deletion, malformed AI and timeout',async()=>{
 const {processInterviewJob}=require('../src/lib/interviews/jobs.ts') as {processInterviewJob:()=>Promise<unknown>}
 const job={id:'job',attempt_id:'attempt',job_type:'transcribe',status:'running',attempt_count:5,max_attempts:5}
 attempt={id:'attempt',user_id:'student-a',format:'mmi',station_id:'station',station_title:'Station',upload_status:'ready',media_kind:'video',recording_path:'response.webm',transcription_audio_path:'transcription.webm',transcription_status:'failed',transcript:null,marking_status:'queued',duration_seconds:90,questions:['Q'],station_snapshot:{title:'Station'}}
 rpcHandler=(name)=>name==='claim_next_interview_job'?[job]:true
 media=true;audio=true;operations.length=0
 const originalFetch=globalThis.fetch,oldKey=process.env.OPENAI_TRANSCRIPTION_API_KEY,oldMarkingKey=process.env.OPENAI_INTERVIEW_MARKING_API_KEY
 try{
 delete process.env.OPENAI_TRANSCRIPTION_API_KEY
 await processInterviewJob()
 assert.equal(calls.at(-1)!.name,'fail_interview_job');assert.equal(calls.at(-1)!.args.p_code,'transcription_not_configured');assert.equal(operations.includes('storage_remove'),false)
 process.env.OPENAI_TRANSCRIPTION_API_KEY='test-only-key'
 let providerCalls=0
 globalThis.fetch=async()=>{providerCalls++;return Response.json({})}
 rpcHandler=(name)=>name==='claim_next_interview_job'?[job]:name==='consume_interview_transcription'?false:true
 const quotaResult=await processInterviewJob()
 assert.deepEqual(quotaResult,{processed:true,deferred:true});assert.equal(providerCalls,0)
 assert.equal(calls.at(-1)!.name,'defer_interview_transcription')
 rpcHandler=(name)=>name==='claim_next_interview_job'?[job]:true
 globalThis.fetch=async()=>Response.json({text:'I would begin by listening carefully, checking what matters to the patient and discussing a safe next step.'})
 await processInterviewJob()
 assert.ok(operations.indexOf('complete_interview_job')<operations.indexOf('storage_remove'))
 job.job_type='assess';attempt.transcription_status='ready';attempt.transcript='A transcript with sufficient evidence for an assessment.';privateMarking={ai_assessment:null}
 process.env.OPENAI_INTERVIEW_MARKING_API_KEY='test-only-key'
 globalThis.fetch=async()=>Response.json({status:'completed',output:[{content:[{type:'output_text',text:'{"malformed":true}'}]}]})
 await processInterviewJob();assert.equal(calls.at(-1)!.args.p_code,'invalid_assessment')
 globalThis.fetch=async()=>{throw new Error('simulated timeout')}
 await processInterviewJob();assert.equal(calls.at(-1)!.args.p_code,'provider_timeout')
 }finally{globalThis.fetch=originalFetch;if(oldKey===undefined)delete process.env.OPENAI_TRANSCRIPTION_API_KEY;else process.env.OPENAI_TRANSCRIPTION_API_KEY=oldKey;if(oldMarkingKey===undefined)delete process.env.OPENAI_INTERVIEW_MARKING_API_KEY;else process.env.OPENAI_INTERVIEW_MARKING_API_KEY=oldMarkingKey;rpcHandler=null}
})


test('timed mock API validates selections, gates prompts and creates canonical retryable responses',async()=>{
 const mock=require('../src/app/api/interviews/mock-session/route.ts') as {POST:(r:Request)=>Promise<Response>}
 const {startMockSession}=require('../src/lib/interviews/mock-session') as typeof import('../src/lib/interviews/mock-session')
 const {INTERVIEW_STATIONS}=require('../src/lib/interviews/stations') as typeof import('../src/lib/interviews/stations')
 const previous=process.env.INTERVIEW_WORKER_SECRET
 try{
  process.env.INTERVIEW_WORKER_SECRET='test-secret'.repeat(4);process.env.INTERVIEW_VIDEO_MARKING_ENABLED='true'
  user=null;assert.equal((await mock.POST(request({action:'start'}))).status,401)
  user={id:'student-a'};attempt=null;insertError=null
  assert.equal((await mock.POST(request({action:'start'}))).status,400)
  const response=await mock.POST(request({action:'start',selection:{format:'mmi',mode:'full'}}))
  assert.equal(response.status,200);assert.match(response.headers.get('cache-control')!,/no-store/)
  const started=await response.json();assert.equal(started.view.phase,'preparation');assert.deepEqual(started.view.questions,[])
  const current=await (await mock.POST(request({token:started.token,index:7,now:Date.now()+4800000}))).json()
  assert.equal(current.view.index,0);assert.equal(current.view.phase,'preparation')
  assert.equal((await initiate.POST(request({mockToken:started.token,mockIndex:7,videoType:'video/webm'}))).status,409)
  user={id:'student-b'};assert.equal((await mock.POST(request({token:started.token}))).status,403)
  user={id:'student-a'}
  const {token}=startMockSession(user.id,{format:'panel',mode:'individual',selectionId:'panel-motivation:2'},Date.now()-31000)
  const body={mockToken:token,mockIndex:0,videoType:'video/webm',stationId:'forged',format:'mmi'}
  const created=await initiate.POST(request(body));assert.equal(created.status,200)
  const result=await created.json(),snapshot=inserted!.station_snapshot as {question_index:number}
  assert.equal(snapshot.question_index,2)
  assert.deepEqual(inserted!.questions,[INTERVIEW_STATIONS.find(s=>s.id==='panel-motivation')!.questions[2]])
  attempt={...inserted!,upload_status:'ready'};inserted=null
  const retried=await (await initiate.POST(request(body))).json()
  assert.equal(retried.attemptId,result.attemptId);assert.equal(retried.uploadStatus,'ready');assert.equal(inserted,null)
  process.env.INTERVIEW_VIDEO_MARKING_ENABLED='false';assert.equal((await mock.POST(request({action:'start',selection:{format:'panel',mode:'full'}}))).status,503)
 }finally{if(previous===undefined)delete process.env.INTERVIEW_WORKER_SECRET;else process.env.INTERVIEW_WORKER_SECRET=previous;attempt=null;user=null;process.env.INTERVIEW_VIDEO_MARKING_ENABLED='true'}
})
