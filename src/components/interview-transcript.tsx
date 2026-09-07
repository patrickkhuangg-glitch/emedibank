'use client'

import { useEffect, useState } from 'react'
import { InterviewTranscriptText } from './interviews/transcript-text'
import { practiceButtonSecondary } from './interviews/practice-buttons'
import { transcriptQuestions, validTranscriptLayout, type TranscriptLayout } from '@/lib/interviews/transcript-sections'

type TranscriptStatus = 'not_requested' | 'processing' | 'ready' | 'failed'
export function InterviewTranscript({ attemptId, initialStatus, initialTranscript, questions:initialQuestions }: { attemptId:string; initialStatus:TranscriptStatus; initialTranscript:string|null; questions?:unknown }) {
 const [status,setStatus]=useState<TranscriptStatus>(initialStatus),[transcript,setTranscript]=useState(initialTranscript)
 const [questions,setQuestions]=useState(()=>transcriptQuestions(initialQuestions))
 const [layout,setLayout]=useState<TranscriptLayout|null>(null),[grouping,setGrouping]=useState<'loading'|'ready'|'unavailable'|'processing'>('loading')
 const [retry,setRetry]=useState(0),[error,setError]=useState('')

 useEffect(()=>{
  if(status!=='ready'||!transcript||questions.length===1||validTranscriptLayout(layout,transcript,questions))return
  const controller=new AbortController()
  async function group() {
   setGrouping('loading')
   try {
    const response=await fetch(`/api/interviews/attempts/${attemptId}/transcript/sections`,{method:'POST',signal:controller.signal})
    const payload=await response.json()
    if(controller.signal.aborted)return
    const canonical=transcriptQuestions(payload.questions)
    if(response.ok&&payload.status==='ready'&&typeof payload.transcript==='string'&&canonical.length&&validTranscriptLayout(payload.layout,payload.transcript,canonical)){
     setTranscript(payload.transcript)
     if(JSON.stringify(canonical)!==JSON.stringify(questions))setQuestions(canonical)
     setLayout(payload.layout);setGrouping('ready')
    }else setGrouping(payload.status==='processing'?'processing':'unavailable')
   }catch{if(!controller.signal.aborted)setGrouping('unavailable')}
  }
  void group()
  return()=>controller.abort()
 },[attemptId,status,transcript,questions,layout,retry])

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

 if(status==='ready'&&transcript)return <section className="mt-7 border-t border-border pt-6">
  <h3 className="font-display text-xl font-semibold tracking-tight">Transcript</h3>
  <p className="mt-2 text-sm leading-6 text-muted">Your original wording, organised for review. Check the recording if a passage looks misplaced or contains a transcription error.</p>
  {questions.length!==1&&!layout&&<div className="mt-3 text-sm text-muted"><p role="status">{grouping==='loading'?'Organising your response by question…':grouping==='processing'?'Question grouping is in progress. Your full transcript is available below.':'Question grouping is currently unavailable. Your full transcript is available below.'}</p>{grouping!=='loading'&&<button type="button" className={`mt-3 ${practiceButtonSecondary}`} onClick={()=>setRetry(value=>value+1)}>{grouping==='processing'?'Check question sections':'Try grouping again'}</button>}</div>}
  <InterviewTranscriptText text={transcript} questions={questions} layout={layout}/>
 </section>
 if(status==='processing')return <section className="mt-7 border-t border-border pt-6"><h3 className="font-display text-xl font-semibold tracking-tight">Transcript</h3><p className="mt-2 text-sm leading-6 text-muted">Your transcript is being prepared automatically. It will appear here when ready. If it takes a while, you can return to your saved recording later.</p><button type="button" className={`mt-3 ${practiceButtonSecondary}`} onClick={createTranscript}>Check transcript</button></section>
 const historic=status==='not_requested'
 return <section className="mt-7 border-t border-border pt-6"><h3 className="font-display text-xl font-semibold tracking-tight">Transcript</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{historic?'This recording was saved before automatic transcripts were available.':'The transcript could not be prepared automatically.'} You can create one now to review your wording.</p><button type="button" onClick={createTranscript} className={`mt-5 ${practiceButtonSecondary}`}>{historic?'Create transcript':'Retry transcript'}</button>{error&&<p role="alert" className="mt-3 text-sm font-semibold text-red-700">{error}</p>}</section>
}
