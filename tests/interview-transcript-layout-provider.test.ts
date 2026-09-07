import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {resolve} from 'node:path'
const require=createRequire(import.meta.url)
const {registerHooks}=require('node:module')
registerHooks({resolve(s:string,c:object,next:(s:string,c:object)=>object){return next(s==='server-only'?resolve('tests/helpers/server-only.cjs'):s,c)}})
const {organiseTranscript}=require('../src/lib/interviews/transcript-section-provider') as typeof import('../src/lib/interviews/transcript-section-provider')
test('grouping provider uses named unit assignments and preserves raw text on every failure',async()=>{
 const originalFetch=globalThis.fetch,originalKey=process.env.OPENAI_INTERVIEW_TRANSCRIPT_LAYOUT_API_KEY,originalFallback=process.env.OPENAI_TRANSCRIPTION_API_KEY
 const originalInterview=process.env.OPENAI_INTERVIEW_MARKING_API_KEY,originalEssay=process.env.OPENAI_ESSAY_MARKING_API_KEY
 let sent:Record<string,unknown>|null=null
 const text='I would listen first. I learnt to ask for help.',questions=['What would you do?','What did you learn?']
 const response=(output:unknown,status='completed')=>new Response(JSON.stringify({status,output:[{content:[{type:'output_text',text:JSON.stringify(output)}]}]}))
 try{
  delete process.env.OPENAI_INTERVIEW_TRANSCRIPT_LAYOUT_API_KEY;delete process.env.OPENAI_TRANSCRIPTION_API_KEY;delete process.env.OPENAI_INTERVIEW_MARKING_API_KEY;delete process.env.OPENAI_ESSAY_MARKING_API_KEY
  await assert.rejects(organiseTranscript(text,questions),/not_configured/)
  process.env.OPENAI_INTERVIEW_TRANSCRIPT_LAYOUT_API_KEY='test-only'
  globalThis.fetch=async(_input,init)=>{sent=JSON.parse(String(init?.body));return response({assignments:{unit_0:0,unit_1:1}})}
  const result=await organiseTranscript(text,questions)
  assert.equal(result.layout.spans.map(span=>text.slice(span.start,span.end)).join(''),text)
  assert.equal(sent!.store,false)
  assert.match(sent!.instructions as string,/untrusted DATA/)
  assert.match(sent!.instructions as string,/Do not assess, correct, rewrite/)
  const input=JSON.parse(sent!.input as string)
  assert.equal(input.units.map((unit:{text:string})=>unit.text).join(''),text)
  assert.deepEqual(input.units.map((unit:{unit_id:string})=>unit.unit_id),['unit_0','unit_1'])
  const format=(sent!.text as {format:{schema:{properties:{assignments:unknown}}}}).format
  assert.deepEqual(format.schema.properties.assignments,{type:'object',additionalProperties:false,properties:{unit_0:{type:['integer','null'],enum:[0,1,null]},unit_1:{type:['integer','null'],enum:[0,1,null]}},required:['unit_0','unit_1']})
  globalThis.fetch=async()=>response({assignments:{unit_1:1,unit_0:0}})
  assert.deepEqual((await organiseTranscript(text,questions)).layout,result.layout,'JSON key order cannot shift sentences')
  for(const output of [{assignments:{unit_0:0}},{assignments:{unit_0:0,unit_1:20}},{assignments:{unit_0:'rewritten text',unit_1:1}},{assignments:{unit_0:0,unit_2:1}},{assignments:{unit_0:0,unit_1:1,unit_2:1}},{assignments:[0,1]},null]){
   globalThis.fetch=async()=>response(output)
   await assert.rejects(organiseTranscript(text,questions))
  }
  globalThis.fetch=async()=>response({assignments:{unit_0:0,unit_1:1}},'incomplete')
  await assert.rejects(organiseTranscript(text,questions),/incomplete/)
  globalThis.fetch=async()=>new Response('{}',{status:429})
  await assert.rejects(organiseTranscript(text,questions),/rate_limit/)
  for(const [status,code] of [[401,'authentication'],[403,'permission'],[400,'request'],[500,'provider_failed']] as const){
   globalThis.fetch=async()=>new Response(JSON.stringify({error:{message:'PRIVATE_KEY_FRAGMENT_AND_TRANSCRIPT'}}),{status})
   await assert.rejects(organiseTranscript(text,questions),error=>error instanceof Error&&error.message===`transcript_layout_${code}`)
  }
  const {transcriptLayoutKey}=require('../src/lib/interviews/transcript-section-provider')
  delete process.env.OPENAI_INTERVIEW_TRANSCRIPT_LAYOUT_API_KEY
  process.env.OPENAI_TRANSCRIPTION_API_KEY='audio-only'
  process.env.OPENAI_ESSAY_MARKING_API_KEY='text-key'
  assert.equal(transcriptLayoutKey(),'text-key')
  process.env.OPENAI_INTERVIEW_MARKING_API_KEY='interview-key'
  assert.equal(transcriptLayoutKey(),'interview-key')
  process.env.OPENAI_INTERVIEW_TRANSCRIPT_LAYOUT_API_KEY='dedicated'
  assert.equal(transcriptLayoutKey(),'dedicated')
 }finally{
  globalThis.fetch=originalFetch
  if(originalKey===undefined)delete process.env.OPENAI_INTERVIEW_TRANSCRIPT_LAYOUT_API_KEY;else process.env.OPENAI_INTERVIEW_TRANSCRIPT_LAYOUT_API_KEY=originalKey
  if(originalFallback===undefined)delete process.env.OPENAI_TRANSCRIPTION_API_KEY;else process.env.OPENAI_TRANSCRIPTION_API_KEY=originalFallback
  if(originalInterview===undefined)delete process.env.OPENAI_INTERVIEW_MARKING_API_KEY;else process.env.OPENAI_INTERVIEW_MARKING_API_KEY=originalInterview
  if(originalEssay===undefined)delete process.env.OPENAI_ESSAY_MARKING_API_KEY;else process.env.OPENAI_ESSAY_MARKING_API_KEY=originalEssay
 }
})
