'use client'
import { useRef,useState } from 'react'
import { useRouter } from 'next/navigation'
import { stationMarkingCredits } from '@/lib/interviews/mock-marking'
export function InterviewStudentActions({id,format,eligible,credits,deleteOnly=false,backHref}:{id:string;format:'mmi'|'panel';eligible:boolean;credits:number;deleteOnly?:boolean;backHref?:string}){
 const router=useRouter(),lock=useRef(false),[pending,setPending]=useState(false),[message,setMessage]=useState(''),[deleting,setDeleting]=useState(false),[submitted,setSubmitted]=useState(false),cost=stationMarkingCredits(format)
 async function submit(){
  if(lock.current)return;lock.current=true;setPending(true);setMessage('')
  try{const r=await fetch(`/api/interviews/attempts/${id}/submit-marking`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expectedCredits:cost})});const data=await r.json();if(!r.ok){setMessage(data.status==='no_credits'?`You need ${cost} Interview marking ${cost===1?'credit':'credits'} to submit.`:data.error??'This attempt cannot be submitted yet.');return}setSubmitted(true);setMessage('Submitted for marking. Your report will appear here when it is ready.');router.refresh()}catch{setMessage('Submission could not be confirmed. Retry safely; you will not be charged twice.')}finally{lock.current=false;setPending(false)}
 }
 async function remove(){setPending(true);try{const r=await fetch(`/api/interviews/attempts/${id}`,{method:'DELETE'});if(!r.ok)throw new Error();if(backHref)router.replace(backHref);router.refresh()}catch{setMessage('Deletion could not be completed. Please try again.')}finally{setPending(false)}}
 return <div className="mt-4 space-y-3">{!deleteOnly&&eligible&&!submitted&&<>
  <button disabled={pending||credits<cost} className="min-h-11 w-full rounded-full bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50" onClick={submit}>{pending?'Submitting…':`Submit for marking · ${cost} ${cost===1?'credit':'credits'}`}</button>
  {credits<cost&&<p className="text-sm leading-6 text-muted">You need {cost} Interview marking {cost===1?'credit':'credits'} to submit. You can still review your recording.</p>}
 </>}
 {deleteOnly&&(deleting?<div className="border-t border-border pt-4"><p className="text-sm leading-6">Delete this recording, transcript and feedback permanently? Credits already used are not refunded by deletion.</p><div className="mt-3 flex flex-wrap gap-3"><button disabled={pending} className="min-h-11 rounded-full border border-border px-4 py-2 text-sm" onClick={remove}>Delete permanently</button><button disabled={pending} className="min-h-11 rounded-full border border-border px-4 py-2 text-sm" onClick={()=>setDeleting(false)}>Keep recording</button></div></div>:<button disabled={pending} className="min-h-11 text-sm text-muted underline underline-offset-4 hover:text-foreground" onClick={()=>setDeleting(true)}>Delete recording</button>)}
 {message&&<p role="status" className="text-sm leading-6">{message}</p>}
 </div>
}
