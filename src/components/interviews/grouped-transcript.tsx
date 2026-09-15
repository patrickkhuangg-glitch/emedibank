'use client'
import { useEffect, useMemo, useState } from 'react'
import { InterviewTranscriptText } from './transcript-text'
import { practiceButtonSecondary } from './practice-buttons'
import { transcriptQuestions, validTranscriptLayout, type TranscriptLayout } from '@/lib/interviews/transcript-sections'

const reviewerMessages:Record<string,string>={
 transcript_layout_authentication:'The grouping provider rejected its API key. Check the dedicated grouping key in hosting configuration.',
 transcript_layout_permission:'The grouping key does not have permission for this request. Check Responses API and model access.',
 transcript_layout_not_configured:'A grouping API key needs to be configured.',
 transcript_layout_model:'The configured grouping model is unavailable to this API key.',
 transcript_layout_request:'The grouping provider rejected the request format. Check the server diagnostics.',
 transcript_layout_rate_limit:'The grouping provider is at its usage limit. Try again later.',
 transcript_layout_timeout:'The grouping request timed out. Try again.',
 transcript_layout_retry_limit:'Grouping has reached its retry limit. An operator can reset this failed presentation cache after resolving the cause.',
}

export function GroupedInterviewTranscript({attemptId,transcript,questions:rawQuestions,reviewer=false}:{attemptId:string;transcript:string;questions:unknown;reviewer?:boolean}) {
 const questions=useMemo(()=>transcriptQuestions(rawQuestions),[rawQuestions])
 const [result,setResult]=useState<{text:string;questions:string[];layout:TranscriptLayout}|null>(null)
 const [state,setState]=useState<'loading'|'processing'|'unavailable'>('loading'),[reason,setReason]=useState(''),[retry,setRetry]=useState(0)
 useEffect(()=>{
  if(questions.length<2)return
  const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined,checks=0
  async function group(){
   setState('loading')
   try{
    const prefix=reviewer?'/api/admin/interviews':'/api/interviews/attempts'
    const response=await fetch(`${prefix}/${attemptId}/transcript/sections`,{method:'POST',signal:controller.signal})
    const payload=await response.json()
    if(controller.signal.aborted)return
    const canonical=transcriptQuestions(payload.questions)
    if(response.ok&&payload.status==='ready'&&typeof payload.transcript==='string'&&canonical.length&&validTranscriptLayout(payload.layout,payload.transcript,canonical)){
     setResult({text:payload.transcript,questions:canonical,layout:payload.layout});return
    }
    setReason(typeof payload.reason==='string'?payload.reason:'')
    setState(payload.status==='processing'?'processing':'unavailable')
    // Follow an existing claim through completion; never automatically retry a failed provider call.
    if(response.ok&&payload.status==='processing'&&++checks<20)timer=setTimeout(group,3000)
   }catch{if(!controller.signal.aborted)setState('unavailable')}
  }
  void group()
  return()=>{controller.abort();if(timer)clearTimeout(timer)}
 },[attemptId,transcript,questions,reviewer,retry])
 return <section className="mt-7 border-t border-border pt-6">
  <h3 className="font-display text-xl font-semibold tracking-tight">Transcript by question</h3>
  <p className="mt-2 text-sm leading-6 text-muted">Original wording, organised for review. Check the recording if a passage looks misplaced or contains a transcription error.</p>
  {questions.length>1&&!result&&<div className="mt-3 text-sm text-muted">
   <p role="status">{state==='loading'?'Organising the response by question…':state==='processing'?'Question grouping is in progress. The full transcript is available below.':'Question grouping is currently unavailable. The full transcript is available below.'}</p>
   {reviewer&&state==='unavailable'&&<p className="mt-2">{reviewerMessages[reason]??'Grouping could not be completed. Review the original transcript and recording while this is resolved.'}</p>}
   {state!=='loading'&&<button type="button" className={`mt-3 ${practiceButtonSecondary}`} onClick={()=>setRetry(value=>value+1)}>{state==='processing'?'Check question sections':'Try grouping again'}</button>}
  </div>}
  <InterviewTranscriptText text={result?.text??transcript} questions={result?.questions??questions} layout={result?.layout}/>
 </section>
}
