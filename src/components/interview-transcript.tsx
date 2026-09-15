'use client'

import { useEffect, useState } from 'react'
import { GroupedInterviewTranscript } from './interviews/grouped-transcript'
import { practiceButtonSecondary } from './interviews/practice-buttons'
import { transcriptQuestions } from '@/lib/interviews/transcript-sections'

type TranscriptStatus = 'not_requested' | 'processing' | 'ready' | 'failed'
export function InterviewTranscript({ attemptId, initialStatus, initialTranscript, questions:initialQuestions }: { attemptId:string; initialStatus:TranscriptStatus; initialTranscript:string|null; questions?:unknown }) {
 const [status,setStatus]=useState<TranscriptStatus>(initialStatus),[transcript,setTranscript]=useState(initialTranscript)
 const [questions,setQuestions]=useState(()=>transcriptQuestions(initialQuestions))
 const [error,setError]=useState('')

 // Read-only polling lets a just-saved recording show its transcript without a reload.
 useEffect(()=>{
  if(status!=='processing')return
  const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;let checks=0
  async function check(){
   try{
    const response=await fetch(`/api/interviews/attempts/${attemptId}/transcript`,{signal:controller.signal,cache:'no-store'})
    const payload=await response.json()
    if(controller.signal.aborted)return
    if(response.ok&&payload.status==='ready'&&typeof payload.transcript==='string'){
     setTranscript(payload.transcript);setQuestions(transcriptQuestions(payload.questions));setStatus('ready');return
    }
    if(response.ok&&payload.status==='failed'){setStatus('failed');return}
   }catch{if(controller.signal.aborted)return}
   if(++checks<30)timer=setTimeout(check,4000)
  }
  timer=setTimeout(check,2000)
  return()=>{controller.abort();if(timer)clearTimeout(timer)}
 },[attemptId,status])

 async function createTranscript(){
  setStatus('processing');setError('')
  try{
   const response=await fetch(`/api/interviews/attempts/${attemptId}/transcript`,{method:'POST'})
   const payload=await response.json()
   if(!response.ok)throw new Error(payload.error||'The transcript could not be created. Please try again.')
   if(payload.status==='processing')return
   setTranscript(payload.transcript);setQuestions(transcriptQuestions(payload.questions));setStatus('ready')
  }catch(requestError){setStatus('failed');setError(requestError instanceof Error?requestError.message:'The transcript could not be created. Please try again.')}
 }

 if(status==='ready'&&transcript)return <GroupedInterviewTranscript key={attemptId} attemptId={attemptId} transcript={transcript} questions={questions}/>
 if(status==='processing')return <section className="mt-7 border-t border-border pt-6"><h3 className="font-display text-xl font-semibold tracking-tight">Transcript</h3><p className="mt-2 text-sm leading-6 text-muted">Your transcript is being prepared automatically. It will appear here when ready. If it takes a while, you can return to your saved recording later.</p><button type="button" className={`mt-3 ${practiceButtonSecondary}`} onClick={createTranscript}>Check transcript</button></section>
 const historic=status==='not_requested'
 return <section className="mt-7 border-t border-border pt-6"><h3 className="font-display text-xl font-semibold tracking-tight">Transcript</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{historic?'This recording was saved before automatic transcripts were available.':'The transcript could not be prepared automatically.'} You can create one now to review your wording.</p><button type="button" onClick={createTranscript} className={`mt-5 ${practiceButtonSecondary}`}>{historic?'Create transcript':'Retry transcript'}</button>{error&&<p role="alert" className="mt-3 text-sm font-semibold text-red-700">{error}</p>}</section>
}
