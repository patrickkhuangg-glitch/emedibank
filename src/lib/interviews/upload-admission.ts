'use client'
export type UploadPhase='waiting'|'uploading'|'retrying'|'checking'|'saving'|'saved'
export const uploadPhaseLabel:Record<UploadPhase,string>={waiting:'Waiting to upload… Keep this tab open.',uploading:'Uploading',retrying:'Connection interrupted. Retrying…',checking:'Checking your recording…',saving:'Finishing your save…',saved:'Recording saved'}
export function uploadRetryDelays(random=Math.random){return [1000,3000,6000,12000,20000].map(delay=>Math.round(delay*(0.75+random()*0.5)))}
export function uploadWait(ms:number,signal:AbortSignal){return new Promise<void>((resolve,reject)=>{
 const abort=()=>{clearTimeout(timer);signal.removeEventListener('abort',abort);reject(new Error('Saving paused. Keep this tab open and retry saving.'))}
 const timer=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve()},ms)
 signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort()
})}
export async function withUploadSlot<T>(attemptId:string,signal:AbortSignal,onPhase:(phase:UploadPhase)=>void,upload:(signal:AbortSignal)=>Promise<T>):Promise<T>{
 const id=crypto.randomUUID(),controller=new AbortController()
 const abort=()=>controller.abort();signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort()
 async function request(action:string,useSignal=true){
  const response=await fetch(`/api/interviews/attempts/${encodeURIComponent(attemptId)}/upload-slot`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,action}),signal:useSignal?AbortSignal.any([controller.signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(5000),keepalive:!useSignal})
  if(!response.ok)throw new Error(response.status===401||response.status===403?'Please sign in again in another tab, then retry saving.':'The upload queue could not be reached. Your recording is still here; retry saving.')
  if(!response.headers.get('content-type')?.includes('application/json'))throw new Error('The upload service changed while saving. Keep this recording tab open, open Studocyte in another tab, then retry saving.')
  try{return (await response.json()).granted===true}catch{throw new Error('The upload queue could not be reached. Your recording is still here; retry saving.')}
 }
 let renewal:ReturnType<typeof setTimeout>|undefined,lost=false
 async function renew(){
  try{if(!await request('renew'))throw Error()}catch{if(!controller.signal.aborted){lost=true;controller.abort()}}
  if(!controller.signal.aborted)renewal=setTimeout(renew,30000)
 }
 try{
  onPhase('waiting');const deadline=Date.now()+10*60*1000
  while(!await request('acquire')){if(Date.now()>deadline)throw new Error('Uploads are busy. Your recording is still here; try saving again shortly.');await uploadWait(3000+Math.random()*3000,controller.signal)}
  renewal=setTimeout(renew,30000);onPhase('uploading')
  try{return await upload(controller.signal)}catch(error){if(lost)throw new Error('Your connection to the upload queue was interrupted. Keep this tab open and retry saving.');throw error}
 }finally{
  controller.abort();clearTimeout(renewal);signal.removeEventListener('abort',abort)
  // Expiry also recovers the slot if a tab closes before this request arrives.
  try{await request('release',false)}catch{}
 }
}
