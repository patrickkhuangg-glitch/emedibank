import {test} from 'node:test'
import assert from 'node:assert/strict'
import {loadModule} from './helpers/load-module.mjs'
import {recordingAvailable,recordingUrlLifetime} from '../src/lib/interviews/recording-retention'
class ApiError extends Error{constructor(message:string,public status:number){super(message)}}
test('private download signs only available owned recordings, uses attachment disposition and never exposes URLs on failure',async()=>{
 let user:{id:string}|null={id:'owner'},admin=false,filter='',signed=0,options:unknown
 let row={recording_path:'owner/attempt/response.webm',video_deleted_at:null as string|null,recording_expires_at:new Date(Date.now()+60000).toISOString(),marking_status:null as string|null,upload_status:'ready',media_kind:'audio'}
 const db={from(){const q={select:()=>q,eq:(k:string,v:string)=>{if(k==='user_id')filter=v;return q},not:()=>q,maybeSingle:async()=>({data:filter==='owner'||admin?row:null})};return q},storage:{from:()=>({createSignedUrl:async(_path:string,ttl:number,o:unknown)=>{assert.ok(ttl<=60);signed++;options=o;return {data:{signedUrl:'https://example.invalid/short-lived'},error:null}}})}}
 const route=loadModule('src/app/api/interviews/attempts/[attemptId]/media/route.ts',{
  '@/lib/auth/dal':{getUser:async()=>user,getProfile:async()=>({role:admin?'admin':'student'}),requireAdmin:async()=>{if(!admin)throw Error()}},
  '@/lib/supabase/admin':{createAdminClient:()=>db},
  '@/lib/interviews/recording-retention':{recordingAvailable,recordingUrlLifetime},
  '@/lib/interviews/api':{InterviewApiError:ApiError,apiError:(e:ApiError)=>Response.json({error:e.message},{status:e.status??503})}
 }) as {GET:(req:Request,ctx:unknown)=>Promise<Response>}
 const call=()=>route.GET(new Request('https://example.invalid/api/interviews/attempts/attempt/media?download=1'),{params:Promise.resolve({attemptId:'attempt'})})
 let r=await call();assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'private, no-store');assert.deepEqual(JSON.parse(JSON.stringify(options)),{download:'interview-attempt.webm'})
 user={id:'another'};r=await call();assert.equal(r.status,404);assert.equal(signed,1)
 user=null;assert.equal((await call()).status,401)
 user={id:'owner'};row={...row,recording_expires_at:new Date(Date.now()-1000).toISOString()};r=await call();assert.equal(r.status,404);assert.equal(signed,1);assert.ok(!JSON.stringify(await r.json()).includes('short-lived'))
 admin=true;assert.equal((await call()).status,404)
})
