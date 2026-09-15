import {INTERVIEW_STUDENT_TONE,INTERVIEW_STUDENT_TONE_AUDIT} from '../src/lib/interviews/student-feedback-tone'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {resolve} from 'node:path'
import {MMI_STUDENT_WRITING_VERSION,MMI_OVERALL_FEEDBACK_STRUCTURE,MMI_DOMAIN_RATIONALE_WRITING} from '../src/lib/interviews/mmi-student-writing'
import {mmiFixture,fixtureStation,fixtureSpec,fixtureTranscript} from './helpers/mmi-v2-fixture'
const require=createRequire(import.meta.url),{registerHooks}=require('node:module')
registerHooks({resolve(s:string,c:object,next:(s:string,c:object)=>object){return next(s==='server-only'?resolve('tests/helpers/server-only.cjs'):s,c)}})
const {structuredInterviewRequest,MMI_ASSESS_INSTRUCTIONS,MMI_AUDIT_INSTRUCTIONS}=require('../src/lib/interviews/provider') as typeof import('../src/lib/interviews/provider')
test('MMI specifies expectations before candidate access, attaches canonical evidence, and audits independently',async()=>{
 const oldFetch=globalThis.fetch,oldKey=process.env.OPENAI_INTERVIEW_MARKING_API_KEY
 const f=mmiFixture(),{reviewer_evidence,reviewer_scope,format_version,rubric_version,format,station_id,source,specification,...mark}=f;void reviewer_evidence;void reviewer_scope;void format_version;void rubric_version;void format;void station_id;void source;void specification
 const requests:Array<{instructions:string;input:string;text:{format:{name:string;schema:{properties:{warnings:{items:{properties:{references:{items:{enum:string[]}}}}}}}}}}>=[]
 try{
  process.env.OPENAI_INTERVIEW_MARKING_API_KEY='synthetic-test-only'
  globalThis.fetch=async(_url,init)=>{const body=JSON.parse(String(init?.body));requests.push(body);const value=body.text.format.name==='mmi_v2_specify'?fixtureSpec:body.text.format.name==='mmi_v2_assess'?mark:{format_version:'mmi-audit-v2',warnings:[],requires_human_attention:false};return new Response(JSON.stringify({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}]}))}
  const result=await structuredInterviewRequest('mmi_station','assess',{...fixtureStation,irrelevant_private_notes:fixtureTranscript},fixtureTranscript)
  assert.equal(requests.length,2);assert.equal(requests[0].text.format.name,'mmi_v2_specify')
  assert.ok(!requests[0].input.includes('I had assumed'));assert.ok(!requests[0].input.includes('irrelevant_private_notes'))
  assert.deepEqual(JSON.parse(requests[1].input).locked_specification,fixtureSpec)
  assert.deepEqual((result.value as {feedback:unknown}).feedback,f)
  await structuredInterviewRequest('mmi_station','audit',fixtureStation,fixtureTranscript,result.value)
  assert.deepEqual(requests[2].text.format.schema.properties.warnings.items.properties.references.items.enum,f.source.references.map(r=>r.id));assert.equal(requests[2].text.format.name,'mmi_v2_audit');assert.ok(requests[2].input.includes('untrusted_assessment'))
  assert.match(MMI_ASSESS_INSTRUCTIONS,/No exercises/);assert.match(MMI_ASSESS_INSTRUCTIONS,/integer scores/);assert.match(MMI_AUDIT_INSTRUCTIONS,/rejected quotations and repair/)
  assert.ok(!requests[0].instructions.includes(MMI_STUDENT_WRITING_VERSION))
  assert.ok(requests[1].instructions.includes(INTERVIEW_STUDENT_TONE))
  assert.ok(requests[1].instructions.includes(MMI_STUDENT_WRITING_VERSION))
  assert.ok(requests[2].instructions.includes(INTERVIEW_STUDENT_TONE_AUDIT))
  assert.ok(requests[2].instructions.includes(MMI_STUDENT_WRITING_VERSION))
  assert.match(requests[1].instructions,/never to candidate speech/)
  assert.match(requests[1].instructions,/At most two writing passes/)
  assert.match(requests[1].instructions,/Overall feedback must always open with encouragement/)
  assert.match(requests[2].instructions,/Flag a missing encouraging opening/)
  assert.ok(requests[1].instructions.includes(MMI_DOMAIN_RATIONALE_WRITING))
  assert.ok(requests[2].instructions.includes(MMI_DOMAIN_RATIONALE_WRITING))
  assert.ok(requests[1].instructions.includes(MMI_OVERALL_FEEDBACK_STRUCTURE))
  assert.ok(requests[2].instructions.includes(MMI_OVERALL_FEEDBACK_STRUCTURE))
  assert.match(requests[1].instructions,/Do not infer personality/)
  assert.match(requests[2].instructions,/Do not require an interviewer insight when there is no supporting evidence/)
  assert.match(requests[2].instructions,/Student wording:/)
  // A style-only audit warning reaches the reviewer without modifying the assessment.
  const before=structuredClone(result.value)
  const wordingAudit={format_version:'mmi-audit-v2',warnings:[{category:'summary',domain:null,references:[],detail:'Student wording: strengths[0].text uses generic praise. Name the explanation that worked.'}],requires_human_attention:true}
  globalThis.fetch=async()=>new Response(JSON.stringify({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(wordingAudit)}]}]}))
  const audited=await structuredInterviewRequest('mmi_station','audit',fixtureStation,fixtureTranscript,result.value)
  assert.deepEqual(audited.value,wordingAudit);assert.deepEqual(result.value,before)
  wordingAudit.requires_human_attention=false
  await assert.rejects(structuredInterviewRequest('mmi_station','audit',fixtureStation,fixtureTranscript,result.value),/invalid_mmi_audit_evidence/)
  globalThis.fetch=async(_url,init)=>{requests.push(JSON.parse(String(init?.body)));return new Response(JSON.stringify({status:'completed',output:[{content:[{type:'output_text',text:'{}'}]}]}))}
  requests.length=0
  await structuredInterviewRequest('panel_response','assess',{...fixtureStation,format:'panel'},fixtureTranscript)
  assert.equal(requests.length,1);assert.equal(requests[0].text.format.name,'interview_assessment');assert.match(requests[0].instructions,/0.5 increments/);assert.ok(!requests[0].instructions.includes(MMI_STUDENT_WRITING_VERSION))
  delete process.env.OPENAI_INTERVIEW_MARKING_API_KEY
  await assert.rejects(structuredInterviewRequest('mmi_station','assess',fixtureStation,fixtureTranscript),/marking_not_configured/)
 }finally{globalThis.fetch=oldFetch;if(oldKey===undefined)delete process.env.OPENAI_INTERVIEW_MARKING_API_KEY;else process.env.OPENAI_INTERVIEW_MARKING_API_KEY=oldKey}
})

test('provider failures and invalid generated marks never become a usable assessment',async()=>{
 const oldFetch=globalThis.fetch,oldKey=process.env.OPENAI_INTERVIEW_MARKING_API_KEY
 const complete=(value:unknown)=>new Response(JSON.stringify({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}]}))
 const fixture=mmiFixture(),badMark={domains:fixture.domains.map(d=>({...d,score:4.5})),global:fixture.global,strengths:fixture.strengths,priorities:fixture.priorities,concerns:fixture.concerns,closing:fixture.closing}
 const cases:Array<{name:string;respond:()=>Promise<Response>;error:RegExp}>=[
  {name:'rate limit',respond:async()=>new Response('{}',{status:429}),error:/provider_http_429/},
  {name:'interrupted output',respond:async()=>new Response(JSON.stringify({status:'incomplete',output:[]})),error:/provider_incomplete/},
  {name:'malformed JSON',respond:async()=>new Response(JSON.stringify({status:'completed',output:[{content:[{type:'output_text',text:'{invalid'}]}]})),error:/provider_invalid_json/},
  {name:'invalid integer rating',respond:async()=>complete(badMark),error:/invalid_mmi/},
  {name:'timeout',respond:async()=>{throw new Error('Simulated timeout')},error:/provider_timeout/},
 ]
 try{
  process.env.OPENAI_INTERVIEW_MARKING_API_KEY='synthetic-test-only'
  for(const scenario of cases){
   let calls=0
   globalThis.fetch=async()=>++calls===1?complete(fixtureSpec):scenario.respond()
   await assert.rejects(structuredInterviewRequest('mmi_station','assess',fixtureStation,fixtureTranscript),scenario.error,scenario.name)
   assert.equal(calls,2)
  }
  globalThis.fetch=async()=>complete({format_version:'mmi-audit-v2',warnings:[{category:'quotation',domain:null,references:['invented-ref'],detail:'Unsupported warning reference.'}],requires_human_attention:true})
  await assert.rejects(structuredInterviewRequest('mmi_station','audit',fixtureStation,fixtureTranscript,{feedback:fixture}),/invalid_mmi_audit_evidence/)
 }finally{globalThis.fetch=oldFetch;if(oldKey===undefined)delete process.env.OPENAI_INTERVIEW_MARKING_API_KEY;else process.env.OPENAI_INTERVIEW_MARKING_API_KEY=oldKey}
})


test('invalid unscored highlights get one bounded repair without changing marks or evidence',async()=>{
 const oldFetch=globalThis.fetch,oldKey=process.env.OPENAI_INTERVIEW_MARKING_API_KEY
 const f=mmiFixture(),mark={domains:f.domains,global:f.global,strengths:f.strengths,priorities:[{domain:'content_reasoning',text:'Unsupported domain advice.',references:['T2']}],concerns:f.concerns,closing:f.closing}
 const requests:Array<{text:{format:{name:string;schema:unknown}};input:string}>=[]
 const complete=(value:unknown)=>new Response(JSON.stringify({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}]}))
 try{
  process.env.OPENAI_INTERVIEW_MARKING_API_KEY='synthetic-test-only'
  globalThis.fetch=async(_url,init)=>{const request=JSON.parse(String(init?.body));requests.push(request);return complete(request.text.format.name==='mmi_v2_specify'?fixtureSpec:request.text.format.name==='mmi_v2_assess'?mark:{strengths:f.strengths,priorities:f.priorities})}
  const result=await structuredInterviewRequest('mmi_station','assess',fixtureStation,fixtureTranscript)
  assert.deepEqual((result.value as {feedback:unknown}).feedback,f)
  assert.equal(requests.length,3);assert.equal(requests[2].text.format.name,'mmi_v2_highlights')
  const schema=JSON.stringify(requests[2].text.format.schema)
  assert.ok(schema.includes('insight_reflection'));assert.ok(!schema.includes('content_reasoning'))
  assert.deepEqual(JSON.parse(requests[2].input).locked_assessment.domains,f.domains)
  // A second invalid response fails closed, with no unbounded retries.
  requests.length=0
  globalThis.fetch=async(_url,init)=>{const request=JSON.parse(String(init?.body));requests.push(request);return complete(request.text.format.name==='mmi_v2_specify'?fixtureSpec:request.text.format.name==='mmi_v2_assess'?mark:{strengths:f.strengths,priorities:mark.priorities})}
  await assert.rejects(structuredInterviewRequest('mmi_station','assess',fixtureStation,fixtureTranscript),/invalid_mmi_highlight_unscored_domain/)
  assert.equal(requests.length,3)
  // Bad evidence is never repaired or silently removed.
  mark.domains[0].evidence[0].text='An invented quote.';requests.length=0
  await assert.rejects(structuredInterviewRequest('mmi_station','assess',fixtureStation,fixtureTranscript),/invalid_mmi_quotation/)
  assert.equal(requests.length,2)
 }finally{globalThis.fetch=oldFetch;if(oldKey===undefined)delete process.env.OPENAI_INTERVIEW_MARKING_API_KEY;else process.env.OPENAI_INTERVIEW_MARKING_API_KEY=oldKey}
})

test('MMI marking guidance never enters panel requests, and cross-format audits fail before a model call',async()=>{
 const oldFetch=globalThis.fetch,oldKey=process.env.OPENAI_INTERVIEW_MARKING_API_KEY
 const requests:Array<{instructions:string;input:string;text:{format:{schema:unknown}}}>=[]
 try{
  process.env.OPENAI_INTERVIEW_MARKING_API_KEY='synthetic-test-only'
  globalThis.fetch=async(_url,init)=>{requests.push(JSON.parse(String(init?.body)));return new Response(JSON.stringify({status:'completed',output:[{content:[{type:'output_text',text:'{}'}]}]}))}
  const panel={...fixtureStation,format:'panel'}
  await structuredInterviewRequest('panel_response','assess',panel,fixtureTranscript)
  await structuredInterviewRequest('panel_response','audit',panel,fixtureTranscript,{format:'panel',feedback:{}})
  for(const request of requests){
   assert.ok(!request.instructions.includes('MMI:'))
   assert.ok(!request.instructions.includes(MMI_STUDENT_WRITING_VERSION))
   assert.match(request.instructions,/0.5 increments/)
   assert.match(request.instructions,/next-practice task/)
   assert.ok(request.input.includes('"panel"'))
   assert.ok(!request.input.includes('"mmi":'))
   assert.ok(!request.input.includes('"australian":'))
   const schema=JSON.stringify(request.text.format.schema)
   assert.ok(schema.includes('personal_evidence'))
   assert.ok(!schema.includes('ethical_reasoning'))
   assert.ok(!schema.includes('"mmi"'))
  }
  assert.match(MMI_ASSESS_INSTRUCTIONS,/MMI-ONLY SCOPE/)
  const count=requests.length
  await assert.rejects(structuredInterviewRequest('panel_response','audit',panel,fixtureTranscript,{feedback:mmiFixture()}),/invalid_panel_version/)
  await assert.rejects(structuredInterviewRequest('mmi_station','audit',{...fixtureStation,station_id:'another-station'},fixtureTranscript,{feedback:mmiFixture()}),/invalid_mmi_station/)
  await assert.rejects(structuredInterviewRequest('mmi_station','assess',{format:'unknown'},fixtureTranscript),/invalid_interview_format/)
  assert.equal(requests.length,count)
  // A saved pre-v2 MMI draft still uses its historical audit, with no panel rubric.
  await structuredInterviewRequest('mmi_station','audit',fixtureStation,fixtureTranscript,{format:'mmi',feedback:{}})
  assert.ok(requests.at(-1)!.input.includes('"mmi":'))
  assert.ok(!requests.at(-1)!.input.includes('"panel":'))
  assert.ok(!requests.at(-1)!.instructions.includes('Panel:'))
 }finally{globalThis.fetch=oldFetch;if(oldKey===undefined)delete process.env.OPENAI_INTERVIEW_MARKING_API_KEY;else process.env.OPENAI_INTERVIEW_MARKING_API_KEY=oldKey}
})
