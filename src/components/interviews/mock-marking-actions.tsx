'use client'
import { useCallback,useEffect,useId,useRef,useState } from 'react'
import { useRouter } from 'next/navigation'
import { MARKING_DESCRIPTION,type MockMarkingSummary } from '@/lib/interviews/mock-marking'
const button='min-h-11 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50'
export function MockMarkingActions({sessionId}:{sessionId:string}) {
 const router=useRouter(),[summary,setSummary]=useState<MockMarkingSummary|null>(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[quote,setQuote]=useState<MockMarkingSummary|null>(null)
 const inFlight=useRef(false)
 const load=useCallback(async(signal?:AbortSignal)=>{
  const r=await fetch(`/api/interviews/mock-sessions/${sessionId}/marking`,{cache:'no-store',signal}),data=await r.json()
  if(!r.ok)throw new Error(data.error??'The marking cost could not load.')
  return data as MockMarkingSummary
 },[sessionId])
 useEffect(()=>{
  const c=new AbortController()
  const refresh=()=>{if(document.visibilityState==='hidden'||inFlight.current)return;void load(c.signal).then(data=>{if(!c.signal.aborted)setSummary(data)}).catch(()=>{})}
  void load(c.signal).then(data=>{if(!c.signal.aborted)setSummary(data)}).catch(e=>{if(!c.signal.aborted)setMessage(e instanceof Error?e.message:'Could not load marking options.')})
  window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh)
  const timer=setInterval(refresh,30000)
  return()=>{c.abort();clearInterval(timer);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh)}
 },[load])
 async function prepare(){
  if(inFlight.current)return
  inFlight.current=true;setBusy(true);setMessage('')
  try{
   const latest=await load();setSummary(latest)
   if(latest.submitted){setMessage('This mock is already submitted.');return}
   if(latest.format==='panel'&&latest.saved<2){setMessage('A panel interview cannot be marked from one answer. Save at least two responses from the same panel before submitting.');return}
   if(!latest.ready||latest.remaining<1){setMessage('The saved responses are not ready for marking yet.');return}
   if(latest.credits<latest.cost){setMessage(`You need ${latest.cost} Interview marking credits to submit.`);return}
   setQuote(latest)
  }catch(e){setMessage(e instanceof Error?e.message:'Marking options could not load.')}
  finally{inFlight.current=false;setBusy(false)}
 }
 async function submit(){
  if(inFlight.current||!quote)return
  inFlight.current=true;setBusy(true);setMessage('')
  try{
   const r=await fetch(`/api/interviews/mock-sessions/${sessionId}/marking`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expectedCredits:quote.cost,expectedResponses:quote.saved})}),data=await r.json()
   if(!r.ok)throw new Error(data.error??'The mock could not be submitted.')
   setMessage(data.status==='already_submitted'?'Your mock is already submitted.':'Your saved mock responses have been submitted for marking.');setQuote(null);setSummary(await load());router.refresh()
  }catch(e){setQuote(null);setMessage(e instanceof Error?e.message:'Submission could not be confirmed. Retry safely; submitted responses will not be charged twice.');try{setSummary(await load())}catch{}}
  finally{inFlight.current=false;setBusy(false)}
 }
 const panel=summary?.format==='panel'
 const tooFewPanelResponses=panel&&!!summary&&summary.saved<2
 return <section className="rounded-2xl bg-surface p-5 sm:p-6" aria-label="Entire mock marking">
  <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
   <div className="max-w-2xl"><h2 className="font-display text-xl font-semibold">{summary?.submitted?'Full mock submitted for marking':panel?'Mark your panel interview':'Mark your full mock'}</h2>
    <p className="mt-2 text-sm leading-6 text-muted">{panel?'One reviewer assesses your saved panel responses together and releases one report with domain scores, strengths and priorities.':MARKING_DESCRIPTION}</p>
    {summary&&!summary.submitted&&<p className="mt-2 text-sm text-muted">{summary.saved} of {summary.total} responses saved. {summary.cost<12?`${12-summary.cost} credits already counted toward the 12-credit total.`:'12 credits for the full mock.'}</p>}
    {panel&&summary&&!summary.submitted&&!tooFewPanelResponses&&summary.saved<summary.total&&<p className="mt-2 text-sm text-muted">You can submit the saved responses together. Missing answers remain unassessed; the full 12-credit price still applies.</p>}
   </div>
   {!summary?<button className="min-h-11 text-sm font-semibold text-brand" disabled={busy} onClick={prepare}>Load marking options</button>:!summary.submitted&&!tooFewPanelResponses&&<button className={`${button} shrink-0`} disabled={busy||!summary.ready||summary.credits<summary.cost||summary.remaining<1} onClick={prepare}>{busy?'Please wait…':`Submit full ${panel?'panel':'mock'} · ${summary.cost} ${summary.cost===1?'credit':'credits'}`}</button>}
  </div>
  {summary&&(summary.submitted?<p role="status" className="mt-3 text-sm text-muted">{panel?'Your saved panel responses are submitted. One report appears after a reviewer approves it.':`All ${summary.total} responses submitted. Feedback appears as each response report is reviewed and released.`}</p>:!summary.ready?<p className="mt-3 text-sm text-muted">{tooFewPanelResponses?'A panel interview cannot be marked from one answer. Save at least two responses from the same panel before submitting.':panel?'All included recordings must finish saving and remain available before submitting.':'Save every response before submitting the full mock.'}</p>:summary.credits<summary.cost?<p className="mt-3 text-sm text-muted">You need {summary.cost} Interview marking credits to submit. Your recordings remain available for self-review.</p>:<p className="mt-3 text-xs text-muted">You’ll confirm the responses and credit cost before submitting.</p>)}
  {!summary?.submitted&&<button disabled={busy} onClick={()=>{void load().then(data=>{setSummary(data);setMessage('Marking credits updated.')}).catch(()=>setMessage('Could not refresh marking credits. Try again.'))}} className="mt-2 min-h-11 text-sm font-semibold text-brand">Refresh marking credits</button>}
  {message&&<p role="status" className="mt-3 text-sm leading-6">{message}</p>}
  {quote&&<MarkingConfirmation quote={quote} busy={busy} onCancel={()=>setQuote(null)} onConfirm={submit}/>}
 </section>
}
function MarkingConfirmation({quote,busy,onCancel,onConfirm}:{quote:MockMarkingSummary;busy:boolean;onCancel:()=>void;onConfirm:()=>void}){
 const ref=useRef<HTMLDialogElement>(null),id=useId(),panel=quote.format==='panel'
 useEffect(()=>{const el=ref.current;el?.showModal();return()=>el?.close()},[])
 return <dialog ref={ref} aria-labelledby={`${id}-title`} aria-describedby={`${id}-body`} onCancel={e=>{e.preventDefault();if(!busy)onCancel()}} className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-3xl border border-border bg-surface p-6 text-foreground shadow-xl backdrop:bg-ink/40 sm:p-8">
  <h2 id={`${id}-title`} className="font-display text-2xl font-semibold">Submit {panel?'panel interview':'full mock'} for marking?</h2>
  <div id={`${id}-body`} className="mt-4 space-y-4 text-sm leading-7">
   <p>This will use <strong>{quote.cost} Interview marking credits</strong>. Your balance will change from {quote.credits} to {quote.credits-quote.cost} credits.</p>
   <p>{quote.saved} of {quote.total} responses are saved and will be included{panel?' in one panel review':'; any already submitted responses will not be charged again'}.</p>
   {panel&&quote.saved<quote.total&&<p className="rounded-2xl bg-brand-muted p-4">This panel is incomplete. The full <strong>12 credits</strong> will still be used. Missing responses cannot be assessed, and no complete-interview overall score will be given. Only the responses saved now are included.</p>}
  </div>
  <div className="mt-6 flex flex-wrap gap-3"><button autoFocus disabled={busy} onClick={onCancel} className="min-h-11 rounded-full border border-border px-5 py-3 text-sm font-semibold">Keep reviewing</button><button disabled={busy} onClick={onConfirm} className={button}>{busy?'Submitting…':`Confirm · use ${quote.cost} credits`}</button></div>
 </dialog>
}
