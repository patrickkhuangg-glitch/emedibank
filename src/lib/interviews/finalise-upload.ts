'use client'
// Finalisation is idempotent on the server. Retry temporary storage/read failures
// serially; never restart the upload or create another attempt here.
export async function finaliseInterviewUpload(attemptId:string,body:unknown,signal:AbortSignal):Promise<Response>{
 for(let attempt=0;attempt<3;attempt++){
  try{
   const response=await fetch(`/api/interviews/attempts/${encodeURIComponent(attemptId)}/finalise`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal})
   if(attempt===2||(response.status!==409&&response.status<500))return response
   await response.body?.cancel()
  }catch(error){if(signal.aborted||attempt===2)throw error}
  await new Promise<void>((resolve,reject)=>{
   const finish=()=>{signal.removeEventListener('abort',abort);resolve()}
   const timer=setTimeout(finish,attempt===0?500:1500)
   const abort=()=>{clearTimeout(timer);signal.removeEventListener('abort',abort);reject(new Error('Saving paused. Retry saving to continue.'))}
   signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort()
  })
 }
 throw new Error('Saving could not finish. Retry saving to continue.')
}
