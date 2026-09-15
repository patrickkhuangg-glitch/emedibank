import {PANEL_TUTOR_AUDIT_INSTRUCTIONS} from '../src/lib/interviews/panel-tutor-audit'
import {INTERVIEW_STUDENT_TONE,INTERVIEW_STUDENT_TONE_AUDIT} from '../src/lib/interviews/student-feedback-tone'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {resolve} from 'node:path'
import {validateSchema} from '../src/lib/interviews/marking-validation'
import {PANEL_STUDENT_WRITING_VERSION,PANEL_STUDENT_DRAFT_WRITING,PANEL_STUDENT_AUDIT_WRITING,PANEL_QUESTION_COMMENT_WRITING} from '../src/lib/interviews/panel-student-writing'
import {panelFixture} from './helpers/panel-fixture'
const require=createRequire(import.meta.url),{registerHooks}=require('node:module')
registerHooks({resolve(s:string,c:object,next:(s:string,c:object)=>object){return next(s==='server-only'?resolve('tests/helpers/server-only.cjs'):s,c)}})
const {structuredInterviewRequest}=require('../src/lib/interviews/provider') as typeof import('../src/lib/interviews/provider')
test('whole-panel provider selects only panel anchors, locks a transcript-free plan and audits one ordered report',async()=>{
 const old=globalThis.fetch,key=process.env.OPENAI_INTERVIEW_MARKING_API_KEY,a=panelFixture(),requests:Array<{instructions:string;input:string;text:{format:{name:string;schema:unknown}};store:boolean}>=[]
 const complete=(value:unknown)=>new Response(JSON.stringify({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}]}))
 try{
 process.env.OPENAI_INTERVIEW_MARKING_API_KEY='synthetic-test-key'
 globalThis.fetch=async(_url,init)=>{const b=JSON.parse(String(init?.body));requests.push(b);return complete(b.text.format.name.endsWith('plan')?a.plan:b.text.format.name.endsWith('assess')?a.feedback:{warnings:[],requires_human_attention:false})}
 const result=await structuredInterviewRequest('panel_complete','assess',a.source,'ignored private candidate text')
 assert.ok(requests[1].instructions.includes(INTERVIEW_STUDENT_TONE)); assert.ok(requests[1].instructions.includes(PANEL_STUDENT_DRAFT_WRITING));assert.ok(requests[1].instructions.includes(PANEL_STUDENT_WRITING_VERSION));assert.ok(!requests[0].instructions.includes(PANEL_STUDENT_WRITING_VERSION))
 assert.deepEqual(result.value,a);assert.equal(requests.length,2);assert.ok(!requests[0].input.includes('I enjoy'));assert.ok(!requests[0].input.includes('ignored private'))
 const planSchema=requests[0].text.format.schema as {properties:{tasks:{minItems:number;maxItems:number;items:{properties:{sequence:{enum:string[]}}}}}}
 assert.deepEqual(planSchema.properties.tasks.items.properties.sequence.enum,a.source.sequences.map(s=>s.id));assert.equal(planSchema.properties.tasks.minItems,10);assert.equal(planSchema.properties.tasks.maxItems,10)
 assert.match(JSON.parse(requests[0].input).domains.resilience.elicitation,/own limits/);assert.match(JSON.parse(requests[0].input).domains.programme_alignment.elicitation,/only when asked/)
 assert.match(JSON.parse(requests[0].input).domains.programme_alignment.boundaries,/named course|mission|programme/i);assert.match(requests[0].instructions,/general equity or cultural-safety questions do not elicit it/)
 assert.deepEqual(JSON.parse(requests[1].input).locked_plan,a.plan);assert.deepEqual(JSON.parse(requests[1].input).ordered_interview,a.source)
 const generatedSchema=requests[1].text.format.schema as {properties:{question_coverage:{items:{anyOf:Array<{properties:{observation:{description:string}}}>}}}}
 assert.ok(generatedSchema.properties.question_coverage.items.anyOf.every(item=>item.properties.observation.description===PANEL_QUESTION_COMMENT_WRITING))
 assert.ok(requests[1].instructions.includes(PANEL_QUESTION_COMMENT_WRITING))
 assert.equal(validateSchema(a.feedback,requests[1].text.format.schema),true)
 const outside=a.feedback.domains.find(d=>d.state==='not_elicited')!
 const unexpectedScore={...a.feedback,domains:a.feedback.domains.map(d=>d.key===outside.key?{...d,state:'scored',score:4,evidence:a.feedback.domains.find(r=>r.evidence.length)!.evidence}:d)}
 assert.equal(validateSchema(unexpectedScore,requests[1].text.format.schema),false)
 assert.equal(validateSchema({...a.feedback,domains:a.feedback.domains.map(d=>d.key===outside.key?{...d,state:'insufficient_evidence'}:d)},requests[1].text.format.schema),false)
 assert.equal(Object.keys(JSON.parse(requests[1].input).anchors).length,12);assert.ok(!JSON.stringify(requests[1]).includes('mmi-feedback-v2'));assert.equal(requests[1].store,false)
 await structuredInterviewRequest('panel_complete','audit',a.source,'',result.value);assert.equal(requests.length,3);assert.ok(requests[2].instructions.includes(INTERVIEW_STUDENT_TONE_AUDIT));assert.ok(requests[2].instructions.includes(PANEL_STUDENT_AUDIT_WRITING));assert.ok(requests[2].instructions.includes(PANEL_QUESTION_COMMENT_WRITING));assert.ok(requests[2].instructions.includes(PANEL_TUTOR_AUDIT_INSTRUCTIONS));assert.match(requests[2].instructions,/EVIDENCE AUDIT ONLY/);assert.deepEqual(JSON.parse(requests[2].input).untrusted_assessment,a.feedback)
 assert.equal(validateSchema({warnings:[{category:'evidence',detail:'Check this reference.',references:['untrusted_assessment.domains']}],requires_human_attention:true},requests[2].text.format.schema),false)
 assert.equal(validateSchema({warnings:[{category:'writing',detail:'A report-wide writing concern.',references:[]}],requires_human_attention:true},requests[2].text.format.schema),true)
 const reorder=(value:unknown):unknown=>Array.isArray(value)?value.map(reorder):value!==null&&typeof value==='object'?Object.fromEntries(Object.entries(value).reverse().map(([k,v])=>[k,reorder(v)])):value
 await structuredInterviewRequest('panel_complete','audit',a.source,'',{...a,source:reorder(a.source)});assert.equal(requests.length,4)
 const before=requests.length;await assert.rejects(structuredInterviewRequest('panel_complete','audit',{...a.source,completeness:'excerpt'},'',a),/invalid_panel_assessment_source/);assert.equal(requests.length,before)
 await assert.rejects(structuredInterviewRequest('panel_response','assess',{format:'mmi'},''),/invalid_interview_format/)
 delete process.env.OPENAI_INTERVIEW_MARKING_API_KEY;await assert.rejects(structuredInterviewRequest('panel_complete','assess',a.source,''),/marking_not_configured/)
 }finally{globalThis.fetch=old;if(key===undefined)delete process.env.OPENAI_INTERVIEW_MARKING_API_KEY;else process.env.OPENAI_INTERVIEW_MARKING_API_KEY=key}
})
test('whole-panel provider fails safely on bad plans, fractional marks, fabricated evidence, invalid audits and upstream failures',async()=>{
 const old=globalThis.fetch,key=process.env.OPENAI_INTERVIEW_MARKING_API_KEY,a=panelFixture()
 const complete=(value:unknown)=>new Response(JSON.stringify({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}]}))
 try{
 process.env.OPENAI_INTERVIEW_MARKING_API_KEY='synthetic-test-key'
 for(const broken of [{...a.feedback,global_rating:{...a.feedback.global_rating,score:5.5}},{...a.feedback,practice_task:'Exercise'},{...a.feedback,domains:a.feedback.domains.map((d,i)=>i===0?{...d,evidence:['fabricated']}:d)}]){let n=0;globalThis.fetch=async()=>complete(++n===1?a.plan:broken);await assert.rejects(structuredInterviewRequest('panel_complete','assess',a.source,''));assert.equal(n,2)}
 for(const badPlan of [{...a.plan,tasks:[]},{...a.plan,tasks:a.plan.tasks.map(t=>({...t,sequence:t.sequence+' - title'}))},{...a.plan,primary_domains:[...a.plan.primary_domains,'programme_alignment'],tasks:a.plan.tasks.map(t=>({...t,domains:t.domains.filter(d=>d!=='programme_alignment')}))}]){let calls=0;globalThis.fetch=async()=>{calls++;return complete(badPlan)};await assert.rejects(structuredInterviewRequest('panel_complete','assess',a.source,''),/invalid_panel_plan/);assert.equal(calls,1)}
 globalThis.fetch=async()=>complete({warnings:[{category:'evidence',references:['fake'],detail:'Unsupported claim.'}],requires_human_attention:true});await assert.rejects(structuredInterviewRequest('panel_complete','audit',a.source,'',a),/invalid_panel_audit/)
 for(const [response,message] of [[new Response('{}',{status:429}),/provider_http_429/],[new Response('{"status":"incomplete"}'),/provider_incomplete/],[new Response('{"status":"completed","output":[{"content":[{"type":"output_text","text":"not JSON"}]}]}'),/provider_invalid_json/]] as const){globalThis.fetch=async()=>response;await assert.rejects(structuredInterviewRequest('panel_complete','assess',a.source,''),message)}
 globalThis.fetch=async()=>{throw new Error('Timeout')};await assert.rejects(structuredInterviewRequest('panel_complete','assess',a.source,''),/provider_timeout/)
 }finally{globalThis.fetch=old;if(key===undefined)delete process.env.OPENAI_INTERVIEW_MARKING_API_KEY;else process.env.OPENAI_INTERVIEW_MARKING_API_KEY=key}
})
