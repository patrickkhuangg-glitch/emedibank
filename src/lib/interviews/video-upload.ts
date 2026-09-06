'use client'
import { Upload } from 'tus-js-client'
import { createClient } from '@/lib/supabase/client'
import { baseMime } from './media-validation'
const SIGN_IN_MESSAGE='Your sign-in could not authorise the upload. Keep this recording tab open, sign in again in another tab, then retry saving.'
export function uploadErrorMessage(error:unknown) {
 const detail=error as {originalResponse?:{getStatus:()=>number;getBody:()=>string};causingError?:{message?:string}}|null
 let status=detail?.originalResponse?.getStatus()
 try{const body=JSON.parse(detail?.originalResponse?.getBody()??'{}');if(body.statusCode)status=Number(body.statusCode)}catch{}
 if(status===401||status===403||detail?.causingError?.message===SIGN_IN_MESSAGE)return SIGN_IN_MESSAGE
 return 'Upload interrupted. Your recording is still on this device. Keep this tab open and retry saving.'
}
export async function uploadInterviewMedia(file:Blob,path:string,onProgress:(value:number)=>void,signal:AbortSignal) {
 const supabase=createClient()
 const {data:{session}}=await supabase.auth.getSession()
 if(!session) throw new Error(SIGN_IN_MESSAGE)
 const origin=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!)
 if(origin.hostname.endsWith('.supabase.co')) origin.hostname=origin.hostname.replace('.supabase.co','.storage.supabase.co')
 await new Promise<void>((resolve,reject)=>{
 const cleanup=()=>signal.removeEventListener('abort',abort)
 const abort=()=>{void upload.abort();cleanup();reject(new Error('Upload paused. Your recording stays on this device; retry saving to resume.'))}
 const upload=new Upload(file,{
 endpoint:`${origin.origin}/storage/v1/upload/resumable`,chunkSize:6*1024*1024,
 retryDelays:[0,3000,5000,10000,20000],uploadDataDuringCreation:true,removeFingerprintOnSuccess:true,
 // XHR appends repeated headers. Set Authorization only in onBeforeRequest,
 // where each chunk receives the current token exactly once.
 metadata:{bucketName:'interview-recordings',objectName:path,contentType:baseMime(file.type),cacheControl:'0'},
 fingerprint:async()=>`interview:${path}:${file.size}`,
 onBeforeRequest:async request=>{const {data:{session:current}}=await supabase.auth.getSession();if(!current)throw new Error(SIGN_IN_MESSAGE);request.setHeader('authorization',`Bearer ${current.access_token}`)},
 onProgress:(sent,total)=>onProgress(Math.round(sent/total*100)),
 onError:error=>{cleanup();reject(new Error(uploadErrorMessage(error)))},
 onSuccess:()=>{cleanup();resolve()},
 })
 signal.addEventListener('abort',abort,{once:true})
 if(signal.aborted){abort();return}
 void upload.findPreviousUploads().then(previous=>{if(signal.aborted)return;if(previous[0])upload.resumeFromPreviousUpload(previous[0]);upload.start()}).catch(()=>{cleanup();reject(new Error('Upload could not start. Try again.'))})
 })
}
