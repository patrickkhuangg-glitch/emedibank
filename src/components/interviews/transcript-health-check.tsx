'use client'
import { useState } from 'react'
import { InterviewTranscriptText } from './transcript-text'
import { practiceButtonSecondary } from './practice-buttons'
import { transcriptQuestions, validTranscriptLayout, type TranscriptLayout } from '@/lib/interviews/transcript-sections'
export function TranscriptHealthCheck(){
 const [pending,setPending]=useState(false),[error,setError]=useState('')
 const [result,setResult]=useState<{transcript:string;questions:string[];layout:TranscriptLayout;model:string}|null>(null)
 async function check(){
  setPending(true);setError('');setResult(null)
  try{
   const response=await fetch('/api/admin/interviews/transcript-check',{method:'POST'})
   const payload=await response.json(),questions=transcriptQuestions(payload.questions)
   if(!response.ok||payload.status!=='ready'||typeof payload.transcript!=='string'||!validTranscriptLayout(payload.layout,payload.transcript,questions)){
    const known=['authentication','permission','model','request','rate_limit','timeout','not_configured','invalid_output','incomplete','provider_failed'].map(x=>`transcript_layout_${x}`)
    throw new Error(known.includes(payload.reason)?payload.reason:'transcript_layout_unavailable')
   }
   setResult({...payload,questions})
  }catch(e){setError(e instanceof Error?e.message:'transcript_layout_unavailable')}
  finally{setPending(false)}
 }
 return <details className="rounded-2xl border border-border p-5">
  <summary className="cursor-pointer font-semibold">Question grouping check</summary>
  <p className="my-3 text-sm text-muted">Check four synthetic answers using the current text provider. This small provider request does not use student recordings, marking credits or create accounts.</p>
  <button type="button" onClick={check} disabled={pending} className={practiceButtonSecondary}>{pending?'Checking grouping…':'Run grouping check'}</button>
  {error&&<p role="alert" className="mt-3 text-sm">Grouping check failed: {error}. Check the grouping key’s Responses API/model permissions and the server configuration.</p>}
  {result&&<div className="mt-4"><p role="status">Grouping check passed · {result.model}</p><InterviewTranscriptText text={result.transcript} questions={result.questions} layout={result.layout}/></div>}
 </details>
}
