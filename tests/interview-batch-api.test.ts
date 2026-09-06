import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadModule } from './helpers/load-module.mjs'
import { completeMock,fullMockMarkingCredits } from '../src/lib/interviews/mock-marking'
const session='20000000-0000-4000-8000-000000000001'
let user:{id:string}|null={id:'owner'},credits=12,enabled=true,missing=false,rows:Record<string,unknown>[]=[],rpcStatus='submitted',rpcCalls=0,preflights=0
const db={from(table:string){let owner:string|undefined,group:string|undefined
 const chain={select:()=>chain,eq:(key:string,value:string)=>{if(key==='user_id')owner=value;if(key.includes('mock_session'))group=value;return chain},limit:()=>chain,in:()=>chain,is:()=>chain,update:()=>{preflights++;return chain},single:async()=>({data:{mmi_credits:credits},error:null}),then:(resolve:(v:unknown)=>void)=>Promise.resolve({data:table==='interview_attempts'?rows.filter(r=>r.user_id===owner&&(r.station_snapshot as {mock_session:{id:string}}).mock_session.id===group):null,error:null}).then(resolve)};return chain},storage:{from:()=>({info:async()=>({data:missing?null:{size:1000},error:missing?{message:'unavailable'}:null})})}}
const auth={getUser:async()=>user},admin={createAdminClient:()=>db}
const api=loadModule('src/lib/interviews/api.ts',{'@/lib/auth/dal':auth,'@/lib/supabase/admin':admin})
const route=loadModule('src/app/api/interviews/mock-sessions/[sessionId]/marking/route.ts',{
 '@/lib/auth/dal':auth,'@/lib/supabase/admin':admin,'@/lib/interviews/api':api,
 '@/lib/supabase/server':{createClient:async()=>({rpc:async()=>{rpcCalls++;return {data:{status:rpcStatus,charged:rpcStatus==='submitted'?12:0},error:null}}})},
 '@/lib/interviews/config':{interviewVideoEnabled:()=>enabled},'@/lib/interviews/mock-marking':{completeMock,fullMockMarkingCredits},
}) as {GET:(r:Request,c:unknown)=>Promise<Response>;POST:(r:Request,c:unknown)=>Promise<Response>}
const request=(body={expectedCredits:12})=>new Request('https://app.test/api',{method:'POST',body:JSON.stringify(body)})
const ctx={params:Promise.resolve({sessionId:session})}
function reset(){rows=Array.from({length:8},(_,index)=>({id:`attempt-${index}`,created_at:'2026-09-06T00:00:00Z',user_id:'owner',format:'mmi',upload_status:'ready',marking_status:null,video_deleted_at:null,recording_path:`owner/attempt-${index}/video.webm`,station_snapshot:{mock_session:{id:session,mode:'full',total:8,index}}}));user={id:'owner'};credits=12;enabled=true;missing=false;rpcStatus='submitted';rpcCalls=0;preflights=0}
test('batch route checks ownership, completeness, credit balance and every recording before atomic RPC',async()=>{
 reset();user=null;assert.equal((await route.GET(request(),ctx)).status,401)
 user={id:'other'};assert.equal((await route.GET(request(),ctx)).status,404)
 user={id:'owner'};const summary=await route.GET(request(),ctx);assert.equal(summary.status,200);assert.match(summary.headers.get('cache-control')!,/no-store/);assert.equal((await summary.json()).remaining,8)
 credits=11;assert.equal((await route.POST(request(),ctx)).status,409);assert.equal(rpcCalls,0)
 credits=12;missing=true;assert.equal((await route.POST(request(),ctx)).status,409);assert.equal(rpcCalls,0);assert.equal(preflights,0)
 missing=false;rows.pop();assert.equal((await route.POST(request(),ctx)).status,409);assert.equal(rpcCalls,0)
 reset();assert.equal((await route.POST(request(),ctx)).status,200);assert.equal(rpcCalls,1);assert.equal(preflights,1)
 rpcStatus='quote_changed';assert.equal((await route.POST(request(),ctx)).status,409)
 rows=rows.map(a=>({...a,marking_status:'queued'}));rpcStatus='already_submitted';credits=0;missing=true
 assert.equal((await route.POST(request(),ctx)).status,200)
 enabled=false;assert.equal((await route.POST(request(),ctx)).status,503)
})
