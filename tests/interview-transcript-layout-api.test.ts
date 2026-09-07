import {test} from 'node:test'
import assert from 'node:assert/strict'
import Module,{createRequire} from 'node:module'
import {resolve} from 'node:path'
const require=createRequire(import.meta.url)
const {registerHooks}=require('node:module')
registerHooks({resolve(s:string,c:object,next:(s:string,c:object)=>object){return next(s==='server-only'?resolve('tests/helpers/server-only.cjs'):s,c)}})
let signedIn=true,owner=true,configured=true,providerCalls=0,claimStatus='claimed',save=true,dbError=false
let transcriptStatus='ready',role='student',submitted=false,marked=false,throwProvider=false
let questions=['First question?','Second question?']
const text='First answer. Second answer.',layout={version:1,spans:[{start:0,end:14,questionIndex:0},{start:14,end:text.length,questionIndex:1}]}
const calls:string[]=[]
const deletions:Array<{table:string;filters:unknown[][]}>=[]
const db={rpc:async(name:string)=>{calls.push(name);return name==='claim_interview_transcript_layout'?{data:{status:claimStatus,transcript:text,questions,layout},error:dbError?{}:null}:{data:save,error:null}}}
function mock(path:string,exports:unknown){const id=require.resolve(path),m=new Module(id);m.filename=id;m.loaded=true;m.exports=exports;require.cache[id]=m}
mock('../src/lib/auth/dal',{getUser:async()=>signedIn?{id:'owner'}:null,getProfile:async()=>signedIn?{id:'reviewer',role}:null})
mock('../src/lib/supabase/admin',{createAdminClient:()=>({...db,from:(table:string)=>{let deletion:{table:string;filters:unknown[][]}|undefined;const query={select:()=>query,delete:()=>{deletion={table,filters:[]};deletions.push(deletion);return query},eq:(...filter:unknown[])=>{deletion?.filters.push(filter);return query},maybeSingle:async()=>({data:table==='interview_markings'?(marked?{attempt_id:'attempt'}:null):owner?{id:'attempt',user_id:'owner',transcript:text,questions,transcription_status:transcriptStatus,submitted_for_marking_at:submitted?'2026-09-07':null,marking_status:marked?'in_review':null}:null,error:null})};return query}})})
mock('../src/lib/interviews/transcript-section-provider',{transcriptLayoutKey:()=>configured?'test':undefined,transcriptLayoutFailure:()=> 'transcript_layout_permission',organiseTranscript:async()=>{providerCalls++;if(throwProvider)throw new Error('PRIVATE_PROVIDER_RESPONSE');return {layout,model:'test'}}})
const {POST}=require('../src/app/api/interviews/attempts/[attemptId]/transcript/sections/route')
const ctx={params:Promise.resolve({attemptId:'attempt'})}
const request=(origin='http://localhost')=>new Request('http://localhost/api/transcript/sections',{method:'POST',headers:{Origin:origin}})
test('grouping API authenticates owners, caches results and fails safely without changing transcription',async()=>{
 signedIn=false;assert.equal((await POST(request(),ctx)).status,401);signedIn=true
 owner=false;assert.equal((await POST(request(),ctx)).status,404);owner=true
 assert.equal((await POST(request('https://other.invalid'),ctx)).status,403)
 configured=false;assert.equal((await (await POST(request(),ctx)).json()).status,'unavailable');assert.equal(providerCalls,0);configured=true
 dbError=true;assert.equal((await (await POST(request(),ctx)).json()).status,'unavailable');assert.equal(providerCalls,0);dbError=false
 assert.equal((await (await POST(request(),ctx)).json()).status,'ready');assert.equal(providerCalls,1)
 claimStatus='ready';assert.equal((await (await POST(request(),ctx)).json()).status,'ready');assert.equal(providerCalls,1)
 claimStatus='processing';assert.equal((await (await POST(request(),ctx)).json()).status,'processing');assert.equal(providerCalls,1)
 claimStatus='claimed';save=false;assert.equal((await (await POST(request(),ctx)).json()).status,'unavailable');save=true
 questions=['Only question?'];const before=providerCalls
 assert.equal((await (await POST(request(),ctx)).json()).status,'ready');assert.equal(providerCalls,before)
 assert.ok(calls.every(name=>name==='claim_interview_transcript_layout'||name==='complete_interview_transcript_layout'))
 assert.ok(deletions.every(d=>d.table==='interview_transcript_layouts'&&JSON.stringify(d.filters)===JSON.stringify([['attempt_id','attempt'],['status','failed'],['model','']])))
})

test('transcript status polling is private, read-only and never exposes unfinished text',async()=>{
 const {GET}=require('../src/app/api/interviews/attempts/[attemptId]/transcript/route')
 signedIn=false;assert.equal((await GET(request(),ctx)).status,401);signedIn=true
 owner=false;assert.equal((await GET(request(),ctx)).status,404);owner=true
 const before=calls.length
 transcriptStatus='processing';const pending=await GET(request(),ctx)
 assert.equal((await pending.json()).transcript,null)
 transcriptStatus='ready';const ready=await GET(request(),ctx)
 assert.match(ready.headers.get('cache-control')??'',/no-store/)
 assert.equal((await ready.json()).transcript,text)
 assert.equal(calls.length,before)
})


test('reviewer grouping requires an admin and a submitted marking, and never widens the owner endpoint',async()=>{
 const {POST:adminPost}=require('../src/app/api/admin/interviews/[attemptId]/transcript/sections/route')
 questions=['First question?','Second question?'];claimStatus='claimed';configured=true;owner=true
 signedIn=false;assert.equal((await adminPost(request(),ctx)).status,401);signedIn=true
 for(const notAdmin of ['student','tutor']){role=notAdmin;assert.equal((await adminPost(request(),ctx)).status,403)}
 role='admin';assert.equal((await adminPost(request('https://other.invalid'),ctx)).status,403)
 assert.equal((await adminPost(request(),ctx)).status,404)
 submitted=true;assert.equal((await adminPost(request(),ctx)).status,404)
 marked=true;const ready=await adminPost(request(),ctx)
 assert.equal((await ready.json()).status,'ready');assert.match(ready.headers.get('cache-control'),/no-store/)
 throwProvider=true
 const reviewerFailure=await (await adminPost(request(),ctx)).json()
 assert.equal(reviewerFailure.reason,'transcript_layout_permission');assert.ok(!JSON.stringify(reviewerFailure).includes('PRIVATE_PROVIDER'))
 const studentFailure=await (await POST(request(),ctx)).json()
 assert.equal(studentFailure.status,'unavailable');assert.equal(studentFailure.reason,undefined)
 owner=false;assert.equal((await POST(request(),ctx)).status,404);owner=true;throwProvider=false
 claimStatus='ready';configured=false;const before=providerCalls
 assert.equal((await (await adminPost(request(),ctx)).json()).status,'ready');assert.equal(providerCalls,before)
})

test('provider check uses only a fixed synthetic sample and requires existing admin access',async()=>{
 const {POST:check}=require('../src/app/api/admin/interviews/transcript-check/route')
 configured=true;throwProvider=false;role='student';signedIn=false
 assert.equal((await check(request())).status,401);signedIn=true
 assert.equal((await check(request())).status,403);role='admin'
 assert.equal((await check(request('https://other.invalid'))).status,403)
 const before=calls.length,response=await check(request()),body=await response.json()
 assert.equal(body.status,'ready');assert.equal(body.questions.length,4)
 assert.match(body.transcript,/both volunteers calmly/)
 assert.equal(calls.length,before,'health check must never create records or touch a cache')
 assert.match(response.headers.get('cache-control'),/no-store/)
})
