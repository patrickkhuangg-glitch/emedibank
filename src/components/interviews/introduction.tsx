'use client'
import {useCallback,useEffect,useRef,useState,type ReactNode} from 'react'
import {usePathname,useRouter} from 'next/navigation'
import {canPrefetchInterviewPage} from '@/lib/interviews/navigation'
import {TourSpotlight} from '@/components/interviews/tour-spotlight'
import {INTRO_STEPS,INTRO_VERSION,introductionAllowed,readIntroductionStep,type IntroStatus} from '@/lib/interviews/introduction'
const primary='min-h-11 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50'
const secondary='min-h-11 rounded-full border border-border px-4 py-2.5 text-sm font-semibold hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'
export function InterviewIntroduction({children,userId,alreadySeen}:{children:ReactNode;userId:string;alreadySeen:boolean}){
 const router=useRouter(),pathname=usePathname(),allowed=introductionAllowed(pathname)
 const [phase,setPhase]=useState<'loading'|'welcome'|'tour'|'idle'>('loading'),[step,setStep]=useState(0),[notice,setNotice]=useState('')
 const initialised=useRef(false),queue=useRef(Promise.resolve()),lastStatus=useRef<IntroStatus>('started')
 const seenKey=`studocyte:interview-intro:${INTRO_VERSION}:${userId}`,progressKey=seenKey+':progress'
 const current=INTRO_STEPS[step]
 const writeProgress=useCallback((index:number|null)=>{try{if(index===null)sessionStorage.removeItem(progressKey);else sessionStorage.setItem(progressKey,JSON.stringify({version:INTRO_VERSION,step:index}))}catch{}},[progressKey])
 function persist(status:IntroStatus){
  lastStatus.current=status
  try{localStorage.setItem(seenKey,'1')}catch{}
  queue.current=queue.current.then(async()=>{
   try{const r=await fetch('/api/interviews/introduction',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})});if(!r.ok)throw new Error();setNotice('')}
   catch{setNotice('You can continue. Your preference could not be saved across devices.')}
  })
 }
 useEffect(()=>{
  if(initialised.current||!allowed)return
  initialised.current=true
  let saved:number|null=null,seen=alreadySeen
  try{saved=readIntroductionStep(sessionStorage.getItem(progressKey));seen=seen||localStorage.getItem(seenKey)==='1'}catch{}
  void Promise.resolve().then(()=>{if(saved!==null){setStep(saved);setPhase('tour')}else setPhase(seen?'idle':'welcome')})
 },[allowed,alreadySeen,seenKey,progressKey])
 useEffect(()=>{
  if(phase!=='tour')return
  if(!allowed){writeProgress(null);void Promise.resolve().then(()=>setPhase('idle'));return}
 },[phase,allowed,writeProgress])
 useEffect(()=>{
  if(phase!=='tour'||!allowed)return
  const next=INTRO_STEPS[step+1]
  if(next&&next.path!==current.path&&canPrefetchInterviewPage(next.path))router.prefetch(next.path)
 },[phase,allowed,step,current.path,router])
 useEffect(()=>{function sync(event:StorageEvent){if(event.key===seenKey&&event.newValue==='1'&&phase==='welcome')setPhase('idle')}window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync)},[phase,seenKey])
 function visit(index:number){setStep(index);writeProgress(index);router.push(INTRO_STEPS[index].path,{scroll:false})}
 function start(){persist('started');setPhase('tour');visit(0)}
 function close(status:IntroStatus='skipped'){persist(status);writeProgress(null);setPhase('idle')}
 const active=phase==='tour'&&allowed
 return <>
  {allowed&&phase==='idle'&&<div className="mx-auto flex max-w-[1440px] justify-end px-5 pt-3 sm:px-8"><button type="button" onClick={start} className="min-h-11 rounded-full px-4 py-2 text-sm font-semibold text-brand hover:bg-brand-muted focus-visible:outline-2 focus-visible:outline-brand">Show introduction</button></div>}
  <div className={active?'pb-[65vh]':''}>{children}</div>
  {allowed&&phase==='welcome'&&<Welcome onStart={start} onSkip={()=>close()}/>}
  {active&&<TourSpotlight target={current.target} stepKey={String(step)} onPage={pathname===current.path} onClose={()=>close()}>
   <div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold text-muted">Introduction · {step+1} of {INTRO_STEPS.length}</p><button type="button" className="min-h-11 rounded-full px-3 text-sm text-muted hover:bg-surface-muted" onClick={()=>close()}>End tour</button></div>
   <div key={step} className="interview-tour-copy"><h2 tabIndex={-1} className="mt-2 font-display text-xl font-semibold focus:outline-none">{current.title}</h2>
   <p className="mt-3 text-sm leading-6 text-muted">{current.body}</p>
   {pathname!==current.path&&<button type="button" className="mt-3 min-h-11 text-sm font-semibold text-brand" onClick={()=>visit(step)}>Show this step on its page</button>}</div>
   <div className="mt-5 flex flex-wrap justify-between gap-3"><button type="button" className={secondary} disabled={step===0} onClick={()=>visit(step-1)}>Back</button><button type="button" className={primary} onClick={()=>{if(step<INTRO_STEPS.length-1)visit(step+1);else{close('completed');router.push('/interviews/practice')}}}>{step===INTRO_STEPS.length-1?'Choose your first question':'Next'}</button></div>
   {notice&&<p role="status" className="mt-3 text-xs leading-5 text-muted">{notice} <button type="button" className="underline" onClick={()=>persist(lastStatus.current)}>Retry saving</button></p>}
  </TourSpotlight>}
 </>
}
function Welcome({onStart,onSkip}:{onStart:()=>void;onSkip:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null)
 useEffect(()=>{const el=dialog.current;el?.showModal();return()=>el?.close()},[])
 return <dialog ref={dialog} aria-labelledby="interview-welcome-title" aria-describedby="interview-welcome-body" onCancel={e=>{e.preventDefault();onSkip()}} className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface p-6 text-foreground backdrop:bg-ink/40 sm:p-8">
  <h2 id="interview-welcome-title" className="font-display text-2xl font-semibold">Would you like an introduction?</h2>
  <p id="interview-welcome-body" className="mt-4 text-sm leading-6 text-muted">Take a quick look around your interview workspace. We’ll start at the dashboard, then show you practice questions, study notes, your story bank and recorded mock interviews.</p>
  <p className="mt-3 text-sm leading-6 text-muted">About two minutes. You can stop at any time or replay it later with Show introduction.</p>
  <div className="mt-6 flex flex-wrap gap-3"><button type="button" className={primary} onClick={onStart}>Yes, show me around</button><button type="button" className={secondary} onClick={onSkip}>I’ll explore on my own</button></div>
 </dialog>
}
