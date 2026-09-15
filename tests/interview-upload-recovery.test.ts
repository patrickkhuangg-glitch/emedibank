import {test} from 'node:test'
import assert from 'node:assert/strict'
import {loadModule} from './helpers/load-module.mjs'
import {baseMime,validateMedia} from '../src/lib/interviews/media-validation'
import {recordingAvailable} from '../src/lib/interviews/recording-retention'
class ApiError extends Error{constructor(message:string,public status=400){super(message)}}
test('upload confirmation uses only owned stored paths and exact size/type, never an arbitrary client path',async()=>{
 let owner=true,inspected='',object:{size:number;contentType:string}|null={size:5,contentType:'audio/webm'}
 const attempt={media_kind:'video',recording_path:'owner/id/response.webm',recording_mime_type:'video/webm',transcription_audio_path:'owner/id/transcription-audio.webm',upload_status:'awaiting_upload',video_deleted_at:null}
 const route=loadModule('src/app/api/interviews/attempts/[attemptId]/upload-status/route.ts',{
  '@/lib/interviews/api':{ownedAttempt:async()=>{if(!owner)throw new ApiError('Recording not found.',404);return {attempt,db:{storage:{from:()=>({info:async(path:string)=>{inspected=path;return {data:object,error:null}}})}}}},readSmallJson:(r:Request)=>r.json(),InterviewApiError:ApiError,apiError:(e:ApiError)=>Response.json({error:e.message},{status:e.status??503})},
  '@/lib/interviews/media-validation':{baseMime,validateMedia},'@/lib/interviews/recording-retention':{recordingAvailable}
 }) as {POST:(r:Request,c:unknown)=>Promise<Response>}
 const call=(extra={})=>route.POST(new Request('https://example.invalid',{method:'POST',body:JSON.stringify({kind:'audio',size:5,type:'audio/webm',path:'another-user/private.webm',...extra})}),{params:Promise.resolve({attemptId:'id'})})
 const r=await call();assert.equal((await r.json()).uploaded,true);assert.equal(inspected,attempt.transcription_audio_path);assert.equal(r.headers.get('cache-control'),'private, no-store')
 assert.equal((await (await call({size:6})).json()).uploaded,false)
 assert.equal((await (await call({type:'audio/mp4'})).json()).uploaded,false)
 assert.equal((await call({size:-1})).status,400)
 object=null;assert.equal((await (await call()).json()).uploaded,false)
 attempt.upload_status='discarded';assert.equal((await (await call()).json()).uploaded,false)
 owner=false;assert.equal((await call()).status,404)
})
test('lost upload acknowledgement is recovered only when the server confirms completion; aborts and failed checks stay unsuccessful',async()=>{
 let confirmed=true,calls=0,status=200
 const {confirmCompletedUpload}=loadModule('src/lib/interviews/video-upload.ts',{'tus-js-client':{Upload:class{}},'@/lib/supabase/client':{},'./media-validation':{baseMime},'./upload-admission':{}},{AbortSignal,fetch:async(url:string,options:{body:string})=>{calls++;assert.equal(url,'/api/interviews/attempts/id/upload-status');assert.deepEqual(JSON.parse(options.body),{kind:'audio',type:'audio/webm',size:5});return Response.json({uploaded:confirmed},{status})}}) as {confirmCompletedUpload:(b:Blob,p:string,s:AbortSignal)=>Promise<boolean>}
 const file=new Blob(['hello'],{type:'audio/webm'}),signal=new AbortController()
 assert.equal(await confirmCompletedUpload(file,'owner/id/response.webm',signal.signal),true)
 confirmed=false;assert.equal(await confirmCompletedUpload(file,'owner/id/response.webm',signal.signal),false)
 status=503;confirmed=true;assert.equal(await confirmCompletedUpload(file,'owner/id/response.webm',signal.signal),false)
 signal.abort();assert.equal(await confirmCompletedUpload(file,'owner/id/response.webm',signal.signal),false);assert.equal(calls,3)
})
