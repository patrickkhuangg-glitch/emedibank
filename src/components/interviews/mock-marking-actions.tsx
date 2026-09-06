'use client'
import { useCallback,useEffect,useRef,useState } from 'react'
import { useRouter } from 'next/navigation'
import { MARKING_DESCRIPTION,type MockMarkingSummary } from '@/lib/interviews/mock-marking'
export function MockMarkingActions({sessionId}:{sessionId:string}) {
 const router=useRouter(),[summary,setSummary]=useState<MockMarkingSummary|null>(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false)
 const inFlight=useRef(false)
 const load=useCallback(async(signal?:AbortSignal)=>{
  const r=await fetch(`/api/interviews/mock-sessions/${sessionId}/marking`,{cache:'no-store',signal}),data=await r.json()
  if(!r.ok)throw new Error(data.error??'The marking cost could not load.')
  return data as MockMarkingSummary
 },[sessionId])
 useEffect(()=>{const c=new AbortController();void load(c.signal).then(data=>{if(!c.signal.aborted)setSummary(data)}).catch(e=>{if(!c.signal.aborted)setMessage(e instanceof Error?e.message:'Could not load marking options.')});return()=>c.abort()},[load])
 async function submit(){
  if(inFlight.current||!summary)return
  inFlight.current=true;setBusy(true);setMessage('')
  try{
   const r=await fetch(`/api/interviews/mock-sessions/${sessionId}/marking`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expectedCredits:summary.cost})}),data=await r.json()
   if(!r.ok)throw new Error(data.error??'The mock could not be submitted.')
   setMessage(data.status==='already_submitted'?'Your entire mock is already submitted.':'Your entire mock has been submitted for marking.');setSummary(await load());router.refresh()
  }catch(e){setMessage(e instanceof Error?e.message:'Submission could not be confirmed. Retry safely; submitted responses will not be charged twice.');try{setSummary(await load())}catch{}}
  finally{inFlight.current=false;setBusy(false)}
 }
 return <section className="rounded-2xl bg-surface p-5 sm:p-6" aria-label="Entire mock marking">
  <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
   <div className="max-w-2xl"><h2 className="font-display text-xl font-semibold">{summary?.submitted?'Full mock submitted for marking':'Mark your full mock'}</h2>
   <p className="mt-2 text-sm leading-6 text-muted">{MARKING_DESCRIPTION}</p>
   {summary&&!summary.submitted&&<p className="mt-2 text-sm text-muted">{summary.saved} of {summary.total} responses saved. {summary.cost<12?`${12-summary.cost} credits already counted toward the 12-credit total.`:'12 credits for the entire mock.'}</p>}
   </div>
   {!summary?<button className="min-h-11 text-sm font-semibold text-brand" disabled={busy} onClick={()=>{void load().then(setSummary).catch(()=>setMessage('Marking options could not load. Try again.'))}}>Load marking options</button>:!summary.submitted&&<button className="min-h-11 shrink-0 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50" disabled={busy||!summary.ready||summary.credits<summary.cost||summary.remaining<1} onClick={submit}>{busy?'Submitting…':`Submit full mock · ${summary.cost} ${summary.cost===1?'credit':'credits'}`}</button>}
  </div>
  {summary&&(summary.submitted?<p role="status" className="mt-3 text-sm text-muted">All {summary.total} responses submitted. Feedback appears as each report is reviewed and released.</p>:!summary.ready?<p className="mt-3 text-sm text-muted">Save every response before submitting the full mock.</p>:summary.credits<summary.cost?<p className="mt-3 text-sm text-muted">You need {summary.cost} Interview marking credits to submit. Your recordings remain available for self-review.</p>:<p className="mt-3 text-xs text-muted">All remaining responses are submitted together. No credits are spent if submission cannot complete.</p>)}
  {message&&<p role="status" className="mt-3 text-sm leading-6">{message}</p>}
 </section>
}
