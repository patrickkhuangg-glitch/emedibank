import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {mmiFixture,fixtureStation,fixtureSpec,fixtureTranscript} from './helpers/mmi-v2-fixture'
import {mmiSource,mmiAttemptSource} from '../src/lib/interviews/mmi-evidence'
import {validateMMIFeedback,makeMMIFeedback,validateMMIAudit,MMI_SPEC_SCHEMA,MMI_MARK_SCHEMA,MMI_AUDIT_SCHEMA,mmiMarkSchemaFor} from '../src/lib/interviews/mmi-feedback'
import {aggregateMMI,mmiClosing} from '../src/lib/interviews/mmi-summary'
import {MMITutorAssessment} from '../src/components/interviews/mmi-tutor-assessment'
import {MMI_DOMAINS} from '../src/lib/interviews/mmi-rubric-v2'
import {validateFeedback,validateDraftFeedback,validateSchema} from '../src/lib/interviews/marking-validation'
import {InterviewFeedback} from '../src/components/interviews/feedback-view'
import {MMIFullMockFeedback,MMIStudentFeedback} from '../src/components/interviews/mmi-feedback-view'
Object.assign(globalThis,{React})
const seeds=JSON.parse(readFileSync('tests/fixtures/mmi-v2-synthetic-seeds.json','utf8')) as Array<{id:string;input:string;expectation:string}>
const entry=(score:number|null,index:number)=>({id:`attempt-${index}`,index,title:`Station ${index+1}`,status:'released',feedback:mmiFixture(score)})
test('v2 anchors preserve all 12 domains and integer 1–7 ratings; panel and saved v1 remain readable',()=>{
 assert.equal(Object.keys(MMI_DOMAINS).length,12)
 for(const d of Object.values(MMI_DOMAINS))assert.equal(Object.keys(d.anchors).join(','),'1,2,3,4,5,6,7')
 for(let score=1;score<=7;score++)assert.doesNotThrow(()=>validateFeedback(mmiFixture(score),'mmi'))
 const f=mmiFixture()
 for(const bad of [0,1.5,4.5,8]){const x=structuredClone(f);x.domains[0].score=bad;assert.throws(()=>validateMMIFeedback(x));const g=structuredClone(f);g.global.score=bad;assert.throws(()=>validateMMIFeedback(g))}
 assert.throws(()=>validateFeedback(f,'panel'))
 const legacy={overall:{score:5.5,band:'Strong developing response',summary:'A clear answer.'},domains:[{key:'communication',label:'Communication',applicable:true,score:5.5,evidence:['Explains the issue.'],comment:'Keep the opening clear.'}],strengths:['Relevant example.'],priorities:['Explain the outcome.'],practice_task:'Rehearse a concise answer.',reviewer_note:'Reviewed and approved by an EMeducate reviewer.'}
 assert.deepEqual(validateFeedback(legacy,'mmi'),legacy);assert.deepEqual(validateFeedback(legacy,'panel'),legacy)
 assert.match(renderToStaticMarkup(React.createElement(InterviewFeedback,{feedback:legacy})),/Next-practice task/)
 assert.throws(()=>validateMMIFeedback({...f,practice_task:'Do a drill.'}))
})
test('recorded omission differs from lost speech; supplied labels and speakers are preserved (seeds 03–07)',()=>{
 const complete=mmiSource({...fixtureStation,evidence_scope:{completeness:'complete',primary_task_coverage:'excerpt'}},'T1 Interviewer: What did you learn? T2 Candidate: We submitted on Friday. That is my answer.')
 const f=mmiFixture(1);f.source=complete;f.global={status:'insufficient_evidence',score:null,reason:'Only the narrow reflection excerpt is supplied.'};f.domains[0].evidence=[{kind:'omission',speaker:'candidate',text:'No reflection in the complete reply to the explicit learning question.',references:['T1','T2']}]
 assert.doesNotThrow(()=>validateMMIFeedback(f))
 const lost=mmiSource(fixtureStation,'T1 Interviewer: What did you learn? T2 Recording note: Candidate response lost due to microphone failure.')
 assert.equal(lost.references.find(r=>r.id==='T2')?.speaker,'recording_note')
 const invalid=structuredClone(f);invalid.source=lost;assert.throws(()=>validateMMIFeedback(invalid),/omission/)
 const unscored=mmiFixture(null);unscored.source=lost;assert.doesNotThrow(()=>validateMMIFeedback(unscored))
 assert.equal(mmiSource({},seeds.find(s=>s.id==='06')!.input).references.some(r=>r.speaker==='interviewer'&&r.text.includes('workload')),true)
 const repair=mmiSource({},seeds.find(s=>s.id==='07')!.input)
 assert.ok(repair.references.some(r=>r.speaker==='candidate'&&r.text.includes('decide the tasks myself')))
 assert.ok(repair.references.some(r=>r.speaker==='candidate'&&r.text.includes('agree the roles')))
})
test('tutor-confirmed empty MMI recordings remain grounded and distinguish no answer from insubstantial evidence',()=>{
 const base={station_snapshot:fixtureStation,station_id:'reflection',format:'mmi',station_title:'Reflection',questions:fixtureStation.questions,transcript:null}
 const notAnswered=mmiAttemptSource({...base,response_disposition:'not_answered' as const})
 assert.equal(notAnswered.response_disposition,'not_answered');assert.equal(notAnswered.completeness,'complete');assert.equal(notAnswered.primary_task_coverage,'full')
 const note=notAnswered.references.find(r=>r.speaker==='recording_note');assert.ok(note);assert.match(note.text,/did not answer/)
 const f=mmiFixture(1);f.source=notAnswered;f.domains[0].evidence=[{kind:'omission',speaker:'recording_note',text:'The complete recording was reviewed and contained no answer to the station.',references:['Q1',note.id]}];f.strengths=[];f.priorities=[]
 assert.doesNotThrow(()=>validateMMIFeedback(f,{source:notAnswered}))
 const mark=Object.fromEntries(Object.keys(MMI_MARK_SCHEMA.properties).map(key=>[key,f[key as keyof typeof f]]))
 assert.equal(validateSchema(mark,mmiMarkSchemaFor(notAnswered,fixtureSpec)),true)
 const insubstantial=mmiAttemptSource({...base,response_disposition:'insubstantial' as const}),unscored=mmiFixture(null);unscored.source=insubstantial
 assert.equal(insubstantial.response_disposition,'insubstantial');assert.doesNotThrow(()=>validateMMIFeedback(unscored,{source:insubstantial}))
 assert.equal(validateSchema(mark,mmiMarkSchemaFor(insubstantial,fixtureSpec)),false)
})
test('evidence must quote exact source and speaker; timing is never invented (seeds 01, 02, 06, 17, 18)',()=>{
 const f=mmiFixture()
 for(const patch of [{text:'I checked understanding successfully.'},{speaker:'actor'},{references:['missing']}]){const x=structuredClone(f);Object.assign(x.domains[0].evidence[0],patch);assert.throws(()=>validateMMIFeedback(x))}
 const changed=structuredClone(f);changed.source.references.find(r=>r.id==='T2')!.text='Changed source';assert.throws(()=>validateMMIFeedback(changed,{source:mmiSource(fixtureStation,fixtureTranscript)}),/source_changed/)
 const source=mmiSource({},seeds.find(s=>s.id==='01')!.input);assert.ok(source.references.every(r=>r.timestamp===null))
 const missingActor=mmiSource({},seeds.find(s=>s.id==='02')!.input);assert.ok(!missingActor.references.some(r=>r.speaker==='actor'))
 const exact=mmiSource({},'T8 [01:23] Candidate: I refused.');assert.equal(exact.references[0].timestamp,'[01:23]');assert.equal(exact.references[0].id,'T8')
 const unknown=mmiSource({},'T1 Candidate: I would [unclear: not?] change the record.');const concern=mmiFixture(null);concern.source=unknown
 concern.concerns=[{id:'C1',status:'serious_observed_concern',description:'Endorses falsification.',consequence:'Could misrepresent attendance.',certainty:'clear',repair:'',evidence:[{kind:'quote',speaker:'candidate',text:'I would [unclear: not?] change the record.',references:['T1']}]}]
 assert.throws(()=>validateMMIFeedback(concern),/uncertain_concern/)
 concern.concerns[0].status='clarification_needed';concern.concerns[0].certainty='uncertain';assert.doesNotThrow(()=>validateMMIFeedback(concern))
})
test('not applicable is separate from selected-but-unscorable; global ratings are holistic and can be unscored',()=>{
 const f=mmiFixture();f.domains.push({key:'rural_remote',status:'not_applicable',score:null,evidence:[],rationale:'Rural health is not elicited by this teamwork reflection.',improvement:'',needed_evidence:''})
 assert.doesNotThrow(()=>validateMMIFeedback(f));f.domains[1].status='insufficient_evidence';assert.throws(()=>validateMMIFeedback(f),/status/)
 f.domains.pop();f.global={status:'insufficient_evidence',score:null,reason:'An isolated excerpt cannot establish whole-station task fulfilment.'};assert.doesNotThrow(()=>validateMMIFeedback(f))
 f.global={status:'scored',score:6,reason:'The holistic primary-task judgement differs from the reflection domain for this stated reason.'};assert.doesNotThrow(()=>validateMMIFeedback(f))
 f.source.primary_task_coverage='excerpt';assert.throws(()=>validateMMIFeedback(f),/global_insufficient/)
 const missing=mmiFixture(null);missing.domains[0].improvement='Explain your reflection better.';assert.throws(()=>validateMMIFeedback(missing),/unseen_performance/)
})
test('supplied aggregation fixtures use scorable globals only, half-up display and unrounded bands',()=>{
 for(const [scores,expected,total,band] of [[[4,5,null],'4.5',3,'Good'],[[6,null,null],'6.0',3,'Strong'],[[null,null],null,2,null],[[4,4,5],'4.3',3,'Satisfactory'],[[6,7],'6.5',2,'Outstanding']] as const){
  const s=aggregateMMI(scores.map((n,i)=>entry(n,i)),total);assert.equal(s.display,expected);assert.equal(s.band,band);assert.equal(s.scorable,scores.filter(n=>n!==null).length)
 }
 const partial=aggregateMMI([entry(6,0)],3);assert.match(partial.closing,/does not establish circuit consistency/)
 const legacy=aggregateMMI([{...entry(6,0),feedback:{overall:{score:7}}}],1);assert.equal(legacy.mean,null)
 const pending=aggregateMMI([{...entry(7,0),status:'in_review'}],1);assert.equal(pending.scorable,0)
 assert.throws(()=>aggregateMMI([entry(4,0),entry(5,0)],2),/circuit/)
 // 4.45 rounds to 4.5 for display but remains Satisfactory, below the 4.50 boundary.
 const boundary=aggregateMMI(Array.from({length:20},(_,i)=>entry(i<9?5:4,i)),20);assert.equal(boundary.display,'4.5');assert.equal(boundary.band,'Satisfactory');assert.equal(boundary.roundingBoundary,true)
})
test('supported concerns survive high averages and form one closing paragraph; exercises are rejected',()=>{
 const f=mmiFixture(6);f.concerns=[{id:'C1',status:'clarification_needed',description:'The account of the agreed plan needs clarification.',consequence:'Its consistency cannot yet be judged.',certainty:'uncertain',repair:'Check the full exchange.',evidence:[{kind:'paraphrase',speaker:'candidate',text:'Describes a plan to check understanding.',references:['T2']}]}]
 const summary=aggregateMMI([{...entry(6,0),feedback:f},entry(7,1)],2)
 assert.equal(summary.strengths.length,1);assert.equal(summary.strengths[0].sources.length,2);
 assert.equal(summary.display,'6.5');assert.match(summary.closing,/Station 1 — clarification needed/)
 assert.equal(summary.closing.includes('\n\n'),false);assert.doesNotMatch(summary.closing,/recurring/)
 const html=renderToStaticMarkup(React.createElement(MMIFullMockFeedback,{entries:[{...entry(6,0),feedback:f},entry(7,1)],total:2}));assert.equal((html.match(/>Circuit feedback</g)??[]).length,1);assert.doesNotMatch(html,/Next-practice task/)
 for(const text of ['Repeat your answer in 60 seconds.','Do a timed rehearsal exercise.','Practise this response again.']){const x=structuredClone(f);x.priorities[0].text=text;assert.throws(()=>validateMMIFeedback(x),/exercises/)}
 assert.match(mmiClosing(f),/clarification needed/)
 assert.throws(()=>validateMMIAudit({format_version:'mmi-audit-v2',warnings:[{category:'quotation',domain:'insight_reflection',references:['invalid'],detail:'Unknown quote.'}],requires_human_attention:true},f))
})
test('structured contracts have required properties and no Markdown output or arbitrary fields',()=>{
 function strict(schema:unknown){const s=schema as Record<string,unknown>;if(s.type==='object'){assert.equal(s.additionalProperties,false);assert.deepEqual(s.required,Object.keys(s.properties as object));Object.values(s.properties as object).forEach(strict)}if(s.items)strict(s.items);if(Array.isArray(s.anyOf))s.anyOf.forEach(strict)}
 for(const schema of [MMI_SPEC_SCHEMA,MMI_MARK_SCHEMA,MMI_AUDIT_SCHEMA])strict(schema)
 const f=mmiFixture();assert.throws(()=>makeMMIFeedback('reflection',f.source,fixtureSpec,{...f,markdown:'hello'}));assert.doesNotThrow(()=>validateDraftFeedback(f))
 assert.equal(seeds.length,24);assert.ok(seeds.every(s=>s.input&&s.expectation))
 const instructions=readFileSync('src/lib/interviews/provider.ts','utf8');assert.ok(!instructions.includes('synthetic-seeds.json'))
})

test('manual reviewers can add attributed recording evidence without replacing source text',()=>{
 const f=mmiFixture(5)
 f.source=mmiSource({questions:['What did you learn?'],evidence_scope:{completeness:'partial',primary_task_coverage:'excerpt'}},'Recording note: Transcript unavailable.')
 const original=structuredClone(f.source)
 f.reviewer_scope={media_inspected:'video',completeness:'complete',primary_task_coverage:'full'}
 f.reviewer_evidence=[{id:'R1',speaker:'candidate',text:'I had assumed my instructions were clear.',timestamp:'0:12',kind:'transcript_correction',media:'video'}]
 f.domains[0].evidence[0].references=['R1'];f.strengths[0].references=['R1'];f.priorities[0].references=['R1']
 assert.doesNotThrow(()=>validateMMIFeedback(f,{source:original,durationSeconds:30}));assert.deepEqual(f.source,original)
 assert.throws(()=>validateMMIFeedback(f,{durationSeconds:10}),/timestamp/)
 f.reviewer_evidence[0].kind='observation';assert.throws(()=>validateMMIFeedback(f),/not_verbatim/)
 f.domains[0].evidence[0].kind='paraphrase';assert.doesNotThrow(()=>validateMMIFeedback(f))
 f.reviewer_scope.media_inspected='none';assert.throws(()=>validateMMIFeedback(f),/reviewer_evidence/)
})

test('older recordings use the same canonical prompt fallback in worker and human review',()=>{
 const attempt={station_snapshot:{},station_id:'reflection',format:'mmi',station_title:'Reflection',questions:['What did you learn?'],transcript:fixtureTranscript}
 assert.deepEqual(mmiAttemptSource(attempt),mmiSource({station_id:'reflection',format:'mmi',title:'Reflection',questions:attempt.questions,snapshot_version:0},fixtureTranscript))
 assert.equal(mmiAttemptSource(attempt).references[0].id,'Q1')
})

test('student reports stay concise while tutor assessment retains transcript, rubric comments and evidence',()=>{
 const f=mmiFixture(5)
 f.domains.push({key:'rural_remote',status:'not_applicable',score:null,evidence:[],rationale:'Not elicited',improvement:'',needed_evidence:''})
 const student=renderToStaticMarkup(React.createElement(MMIStudentFeedback,{feedback:f}))
 assert.match(student,/5 \/ 7/);assert.match(student,/Domains assessed/);assert.match(student,/What you did well/);assert.match(student,/What to improve/);assert.match(student,/Overall feedback/)
 assert.doesNotMatch(student,/Task and assessment basis|Source evidence|Selected domains|Rural &amp; Remote|S1-T|AI assessment/)
 assert.ok(!student.includes(f.domains[0].rationale));assert.ok(!student.includes(f.domains[0].evidence[0].text))
 const tutor=renderToStaticMarkup(React.createElement(MMITutorAssessment,{source:f.source,assessment:f,audit:null}))
 assert.match(tutor,/Station transcript/);assert.ok(tutor.includes(fixtureStation.preparation));assert.ok(tutor.includes(fixtureStation.questions[0]));assert.match(tutor,/Candidate response/);assert.match(tutor,/Interviewer question \/ follow-up/);assert.match(tutor,/AI assessment/);assert.match(tutor,/Overall verdict/);assert.ok(tutor.includes(f.domains[0].rationale));assert.ok(tutor.includes(f.domains[0].evidence[0].text))
 const missing=renderToStaticMarkup(React.createElement(MMIStudentFeedback,{feedback:mmiFixture(null)}))
 const noPrompt=renderToStaticMarkup(React.createElement(MMITutorAssessment,{source:mmiSource({},'Unknown: Some words.'),assessment:null,audit:null}));assert.match(noPrompt,/No scenario or preparation text was saved/);assert.match(noPrompt,/No question text was saved/);assert.match(noPrompt,/Speaker not identified/);
 assert.match(missing,/Unscored/);assert.doesNotMatch(missing,/0 \/ 7/)
})

test('circuit feedback encourages first using an approved strength, with honest fallback when none is available',()=>{
 const f=mmiFixture(5)
 const summary=aggregateMMI([{...entry(5,0),feedback:f},entry(6,1)],2)
 assert.ok(summary.closing.startsWith(`Keep building on what you did well in Station 1. ${f.strengths[0].text}`))
 assert.equal(summary.display,'5.5')
 const empty=mmiFixture(null);empty.strengths=[]
 const missing=aggregateMMI([{...entry(null,0),feedback:empty},{...entry(7,1),status:'in_review'}],2)
 assert.ok(missing.closing.startsWith('You can use this feedback to take your next step.'))
 assert.equal(missing.mean,null)
})

// Saved JSONB objects have different key order from freshly constructed canonical sources.
test('saved JSONB reports remain editable without allowing changed evidence or specifications',()=>{
 const original=mmiFixture()
 const reorder=(value:unknown):unknown=>Array.isArray(value)?value.map(reorder):value!==null&&typeof value==='object'?Object.fromEntries(Object.entries(value).reverse().map(([k,v])=>[k,reorder(v)])):value
 const stored=reorder(original) as typeof original
 const options={source:original.source,specification:original.specification,stationId:original.station_id}
 assert.doesNotThrow(()=>validateMMIFeedback(stored,options))
 const changed=structuredClone(stored);changed.source.references[0].text+=' Altered prompt.'
 assert.throws(()=>validateMMIFeedback(changed,options),/mmi_source_changed/)
 const moved=structuredClone(stored);moved.source.references.reverse()
 assert.throws(()=>validateMMIFeedback(moved,options),/mmi_source_changed/)
 const specification=structuredClone(stored);specification.specification.role='Changed role'
 assert.throws(()=>validateMMIFeedback(specification,options),/mmi_specification_changed/)
})

test('generated MMI marks require nonempty citations drawn from the actual source',()=>{
 const f=mmiFixture(),schema=mmiMarkSchemaFor(f.source)
 const mark=Object.fromEntries(Object.keys(MMI_MARK_SCHEMA.properties).map(key=>[key,f[key as keyof typeof f]]))
 assert.equal(validateSchema(mark,schema),true)
 for(const references of [[],['invented-turn'],['T2-T3']]){
  assert.equal(validateSchema({...mark,strengths:[{...f.strengths[0],references}]},schema),false)
 }
 const unscored=mmiFixture(null);unscored.strengths=[{domain:'insight_reflection',text:'Unsupported reflection praise.',references:['T2']}]
 assert.throws(()=>validateMMIFeedback(unscored),/invalid_mmi_highlight_unscored_domain/)
})

test('generation contracts enforce source completeness and scored/unscored states',()=>{
 const f=mmiFixture(),mark=Object.fromEntries(Object.keys(MMI_MARK_SCHEMA.properties).map(key=>[key,f[key as keyof typeof f]]))
 const unknown={...f.source,completeness:'unknown' as const},schema=mmiMarkSchemaFor(unknown,fixtureSpec)
 assert.equal(validateSchema(mark,schema),true)
 const omission={...f.domains[0],evidence:[{kind:'omission',speaker:'candidate',text:'Missing answer.',references:['Q1','T2']}]}
 assert.equal(validateSchema({...mark,domains:[omission]},schema),false)
 assert.equal(validateSchema({...mark,domains:[{...f.domains[0],status:'insufficient_evidence'}]},schema),false)
 assert.equal(validateSchema({...mark,domains:[{...f.domains[0],status:'not_applicable',score:null,improvement:''}]},schema),false)
 assert.equal(validateSchema(mark,mmiMarkSchemaFor({...unknown,primary_task_coverage:'excerpt'},fixtureSpec)),false)
})
