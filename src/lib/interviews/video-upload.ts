'use client'
import { Upload } from 'tus-js-client'
import { createClient } from '@/lib/supabase/client'
import {withUploadSlot,uploadRetryDelays,type UploadPhase} from './upload-admission'
import { baseMime } from './media-validation'
const SIGN_IN_MESSAGE='Your sign-in could not authorise the upload. Keep this recording tab open, sign in again in another tab, then retry saving.'
export async function confirmCompletedUpload(file:Blob,path:string,signal:AbortSignal){
 if(signal.aborted)return false
 const attemptId=path.split('/')[1]
 if(!attemptId)return false
 try{
 const response=await fetch(`/api/interviews/attempts/${encodeURIComponent(attemptId)}/upload-status`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:baseMime(file.type).startsWith('audio/')?'audio':'video',type:baseMime(file.type),size:file.size}),signal:AbortSignal.any([signal,AbortSignal.timeout(15000)])})
 return response.ok&&(await response.json()).uploaded===true&&!signal.aborted
 }catch{return false}
}
export function uploadErrorMessage(error:unknown) {
 const detail=error as {originalResponse?:{getStatus:()=>number;getBody:()=>string};causingError?:{message?:string}}|null
 let status=detail?.originalResponse?.getStatus()
 try{const body=JSON.parse(detail?.originalResponse?.getBody()??'{}');if(body.statusCode)status=Number(body.statusCode)}catch{}
 if(status===401||status===403||detail?.causingError?.message===SIGN_IN_MESSAGE)return SIGN_IN_MESSAGE
 return 'Upload interrupted. Your recording is still on this device. Keep this tab open and retry saving.'
}
export async function uploadInterviewMedia(file:Blob,path:string,onProgress:(value:number)=>void,signal:AbortSignal,onPhase:(phase:UploadPhase)=>void=()=>{}) {
 return withUploadSlot(path.split('/')[1],signal,onPhase,transferSignal=>transferInterviewMedia(file,path,onProgress,transferSignal,onPhase))
}
async function transferInterviewMedia(file:Blob,path:string,onProgress:(value:number)=>void,signal:AbortSignal,onPhase:(phase:UploadPhase)=>void) {
 const supabase=createClient()
 const {data:{session}}=await supabase.auth.getSession()
 if(!session) throw new Error(SIGN_IN_MESSAGE)
 const origin=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!)
 if(origin.hostname.endsWith('.supabase.co')) origin.hostname=origin.hostname.replace('.supabase.co','.storage.supabase.co')
 await new Promise<void>((resolve,reject)=>{
 let idleTimer:ReturnType<typeof setTimeout>|undefined
 const cleanup=()=>{clearTimeout(idleTimer);signal.removeEventListener('abort',abort)}
 const touch=()=>{clearTimeout(idleTimer);idleTimer=setTimeout(()=>{void upload.abort();cleanup();reject(new Error('The upload stopped making progress. Your recording is still here. Check your connection and retry saving.'))},120000)}
 const abort=()=>{void upload.abort();cleanup();reject(new Error('Upload paused. Your recording stays on this device; retry saving to resume.'))}
 const upload=new Upload(file,{
 endpoint:`${origin.origin}/storage/v1/upload/resumable`,chunkSize:6*1024*1024,
 retryDelays:uploadRetryDelays(),
 onShouldRetry:error=>{const status=error.originalResponse?.getStatus()??0;const retry=(status===409&&error.originalRequest?.getMethod()!=='POST')||status===0||status===408||status===423||status===429||status>=500;if(retry){touch();onPhase('retrying')};return retry},uploadDataDuringCreation:true,removeFingerprintOnSuccess:true,
 // XHR appends repeated headers. Set Authorization only in onBeforeRequest,
 // where each chunk receives the current token exactly once.
 metadata:{bucketName:'interview-recordings',objectName:path,contentType:baseMime(file.type),cacheControl:'0'},
 fingerprint:async()=>`interview:${path}:${file.size}`,
 onBeforeRequest:async request=>{touch();const {data:{session:current}}=await supabase.auth.getSession();if(!current)throw new Error(SIGN_IN_MESSAGE);request.setHeader('authorization',`Bearer ${current.access_token}`)},
 onProgress:(sent,total)=>{touch();onPhase('uploading');onProgress(Math.round(sent/total*100))},
 onError:async error=>{
 // A completed creation request can lose its response. Retrying then returns
 // 409 because overwrites are forbidden. Verify the existing owned object;
 // never turn an unverified network error into a successful save.
 clearTimeout(idleTimer);onPhase('checking')
 if(await confirmCompletedUpload(file,path,signal)){cleanup();onProgress(100);resolve();return}
 cleanup();reject(new Error(uploadErrorMessage(error)))
 },
 onSuccess:()=>{cleanup();resolve()},
 })
 signal.addEventListener('abort',abort,{once:true})
 if(signal.aborted){abort();return}
 void upload.findPreviousUploads().then(previous=>{if(signal.aborted)return;if(previous[0])upload.resumeFromPreviousUpload(previous[0]);touch();upload.start()}).catch(()=>{cleanup();reject(new Error('Upload could not start. Try again.'))})
 })
}
