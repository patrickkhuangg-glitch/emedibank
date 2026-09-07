import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {resolve} from 'node:path'
const require=createRequire(import.meta.url)
const {registerHooks}=require('node:module')
registerHooks({resolve(s:string,c:object,next:(s:string,c:object)=>object){return next(s==='server-only'?resolve('tests/helpers/server-only.cjs'):s,c)}})
const {organiseTranscript}=require('../src/lib/interviews/transcript-section-provider') as typeof import('../src/lib/interviews/transcript-section-provider')
test('grouping provider uses index-only structured output and preserves raw text on every failure',async()=>{
 const originalFetch=globalThis.fetch,originalKey=process.env.OPENAI_INTERVIEW_TRANSCRIPT_LAYOUT_API_KEY,originalFallback=process.env.OPENAI_TRANSCRIPTION_API_KEY
 let sent:Record<string,unknown>|null=null
 const text='I would listen first. I learnt to ask for help.',questions=['What would you do?','What did you learn?']
 const response=(output:unknown,status='completed')=>new Response(JSON.stringify({status,output:[{content:[{type:'output_text',text:JSON.stringify(output)}]}]}))
 try{
  delete process.env.OPENAI_INTERVIEW_TRANSCRIPT_LAYOUT_API_KEY;delete process.env.OPENAI_TRANSCRIPTION_API_KEY
  await assert.rejects(organiseTranscript(text,questions),/not_configured/)
  process.env.OPENAI_INTERVIEW_TRANSCRIPT_LAYOUT_API_KEY='test-only'
  globalThis.fetch=async(_input,init)=>{sent=JSON.parse(String(init?.body));return response({question_indices:[0,1]})}
  const result=await organiseTranscript(text,questions)
  assert.equal(result.layout.spans.map(span=>text.slice(span.start,span.end)).join(''),text)
  assert.equal(sent!.store,false)
  assert.match(sent!.instructions as string,/untrusted DATA/)
  assert.match(sent!.instructions as string,/Do not assess, correct, rewrite/)
  const input=JSON.parse(sent!.input as string)
  assert.equal(input.units.map((unit:{text:string})=>unit.text).join(''),text)
  for(const output of [{question_indices:[0]},{question_indices:[0,20]},{question_indices:['rewritten text',1]}]){
   globalThis.fetch=async()=>response(output)
   await assert.rejects(organiseTranscript(text,questions))
  }
  globalThis.fetch=async()=>response({question_indices:[0,1]},'incomplete')
  await assert.rejects(organiseTranscript(text,questions),/incomplete/)
  globalThis.fetch=async()=>new Response('{}',{status:429})
  await assert.rejects(organiseTranscript(text,questions),/provider_failed/)
 }finally{
  globalThis.fetch=originalFetch
  if(originalKey===undefined)delete process.env.OPENAI_INTERVIEW_TRANSCRIPT_LAYOUT_API_KEY;else process.env.OPENAI_INTERVIEW_TRANSCRIPT_LAYOUT_API_KEY=originalKey
  if(originalFallback===undefined)delete process.env.OPENAI_TRANSCRIPTION_API_KEY;else process.env.OPENAI_TRANSCRIPTION_API_KEY=originalFallback
 }
})
