import {test} from 'node:test'
import assert from 'node:assert/strict'
import {loadModule} from './helpers/load-module.mjs'
import {validWorkerSecret} from '../src/lib/interviews/worker-auth'
const secret='synthetic-worker-secret-32-characters-minimum'
test('HTTP dispatch awaits at most four jobs; unauthorised calls cannot start work',async()=>{
 let active=0,peak=0,calls=0,fail=false
 const route=loadModule('src/app/api/internal/interviews/process/route.ts',{
  '@/lib/interviews/worker-auth':{validWorkerSecret},
  '@/lib/interviews/operations':{recordInterviewOperation:async()=>{}},
  '@/lib/interviews/jobs':{processInterviewJob:async()=>{calls++;peak=Math.max(peak,++active);await new Promise(r=>setTimeout(r,5));active--;if(fail)throw Error('synthetic');return {processed:true}}}
 },{process:{env:{INTERVIEW_WORKER_SECRET:secret}}}) as {GET:(r:Request)=>Promise<Response>}
 assert.equal((await route.GET(new Request('https://example.invalid'))).status,401);assert.equal(calls,0)
 const request=()=>new Request('https://example.invalid',{headers:{authorization:`Bearer ${secret}`}})
 assert.equal((await route.GET(request())).status,200);assert.equal(calls,4);assert.equal(peak,4);assert.equal(active,0)
 fail=true;assert.equal((await route.GET(request())).status,503);assert.equal(active,0)
})
test('cleanup uses two bounded independent lanes and accepts the configured cron secret',async()=>{
 let active=0,peak=0,calls=0,fail=false,sideCleanup=0
 const route=loadModule('src/app/api/internal/interviews/cleanup/route.ts',{
  '@/lib/interviews/worker-auth':{validWorkerSecret},
  '@/lib/interviews/operations':{recordInterviewOperation:async()=>{}},
  '@/lib/supabase/admin':{createAdminClient:()=>({rpc:async()=>({data:100,error:null})})},
  '@/lib/interviews/storage-cleanup':{cleanupTranscriptionAudio:async()=>{sideCleanup++},cleanupPracticeAudioUploads:async()=>{sideCleanup++}},
  '@/lib/interviews/jobs':{processInterviewJob:async(cleanup:boolean)=>{assert.equal(cleanup,true);calls++;peak=Math.max(peak,++active);await new Promise(r=>setTimeout(r,1));active--;return {processed:true,failed:fail}}}
 },{process:{env:{CRON_SECRET:secret}}}) as {GET:(r:Request)=>Promise<Response>}
 const request=()=>new Request('https://example.invalid',{headers:{authorization:`Bearer ${secret}`}})
 assert.equal((await route.GET(new Request('https://example.invalid'))).status,401);assert.equal(calls,0)
 assert.equal((await route.GET(request())).status,200);assert.equal(peak,2);assert.equal(calls,100);assert.equal(sideCleanup,2)
 fail=true;assert.equal((await route.GET(request())).status,503);assert.equal(active,0)
})
