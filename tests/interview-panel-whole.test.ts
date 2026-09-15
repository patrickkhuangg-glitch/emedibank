import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {wholePanelSource,panelPlanInput} from '../src/lib/interviews/panel-source'
import {validateWholePanelFeedback,validatePanelPlan,validatePanelAudit} from '../src/lib/interviews/panel-feedback'
import {panelFixture,panelMembers,panelSession,panelOwner} from './helpers/panel-fixture'
function valid(a=panelFixture()){return validateWholePanelFeedback(a.feedback,a.source,a.plan)}
test('whole-panel contract uses twelve independent integer domains and a nullable holistic rating',()=>{
 assert.equal(valid().domains.length,12)
 for(const score of [null,1,2,3,4,5,6,7]){const a=panelFixture();a.feedback.global_rating.score=score;a.feedback.global_rating.band=score===null?null:['Very poor','Weak','Below expected','Satisfactory','Good','Strong','Outstanding'][score-1] as typeof a.feedback.global_rating.band;assert.equal(valid(a).global_rating.score,score)}
 for(const corrupt of [(a:ReturnType<typeof panelFixture>)=>a.feedback.domains[0].score=4.5,a=>Object.assign(a.feedback.domains[0],{key:'mmi_communication'}),a=>Object.assign(a.feedback,{practice_task:'Exercise'}),a=>a.feedback.domains[0].evidence=['invented'],a=>a.feedback.domains[0].evidence=['Q1-Q1'],a=>a.feedback.question_coverage[0].sequence='Q999',a=>a.feedback.global_rating.band='Strong',a=>a.feedback.domains[0].state='not_elicited',a=>a.feedback.closing_paragraph='First paragraph\nSecond paragraph'] as Array<(a:ReturnType<typeof panelFixture>)=>void>){const a=panelFixture();corrupt(a);assert.throws(()=>valid(a))}
 const a=panelFixture();a.feedback.concerns=[{sequence:'Q2',level:'clarification_needed',detail:'Clarify the stated role.'}];assert.throws(()=>valid(a));a.feedback.closing_paragraph+=' Please clarify your role in Q2.';valid(a)
 assert.throws(()=>validatePanelAudit({warnings:[{category:'evidence',detail:'Check this.',references:['fake']}],requires_human_attention:true},a.source))
 assert.throws(()=>validatePanelAudit({warnings:[{category:'evidence',detail:'Check this.',references:['Q1']}],requires_human_attention:false},a.source))
})
test('source is canonical and preserves speaker attribution, exact text and distinct question IDs',()=>{
 const members=panelMembers();members[1].transcript='Panel: What did you learn? Candidate: I asked for help. Interviewer: Why? Candidate: I needed another view.'
 const source=wholePanelSource([...members].reverse(),panelSession,panelOwner)
 assert.deepEqual(source.sequences.map(s=>s.id),Array.from({length:10},(_,i)=>`Q${i+1}`));assert.equal(new Set(source.sequences.flatMap(s=>s.references.map(r=>r.id))).size,source.sequences.flatMap(s=>s.references).length)
 const turns=source.sequences[1].references.filter(r=>r.speaker!=='prompt');assert.deepEqual(turns.map(r=>r.speaker),['interviewer','candidate','interviewer','candidate']);for(const r of turns)assert.equal(members[1].transcript!.slice(r.start!,r.end!),r.text)
 assert.ok(!JSON.stringify(panelPlanInput(source)).includes('I asked for help'))
 for(const broken of [[],[members[0]],[members[0],...members.slice(0,9)],members.map((r,i)=>i===1?{...r,user_id:'other'}:r),members.map((r,i)=>i===1?{...r,format:'mmi'}:r),members.map((r,i)=>i===1?{...r,transcript:null}:r),members.map((r,i)=>i===1?{...r,video_deleted_at:'today'}:r)])assert.throws(()=>wholePanelSource(broken,panelSession,panelOwner))
 const a=panelFixture();a.plan.tasks[1].sequence='Q1';assert.throws(()=>validatePanelPlan(a.plan,a.source))
})
test('lost primary audio withholds global rating without creating a low score or omitting supported domains',()=>{
 const members=panelMembers();for(let i=1;i<10;i++)members[i].transcript='Recording note: audio lost.'
 const a=panelFixture();a.source=wholePanelSource(members,panelSession,panelOwner)
 for(const q of a.feedback.question_coverage)if(q.sequence!=='Q1'){q.coverage='not_assessable';q.observation='Recording unavailable; performance cannot be inferred.'}
 for(const d of a.feedback.domains)if(d.key==='reflection_learning'||d.key==='personal_evidence'){d.state='insufficient_evidence';d.score=null;d.evidence=[];d.why='The recording is missing.'}
 a.feedback.domains[0].evidence=[a.source.sequences[0].references.find(r=>r.speaker==='candidate')!.id]
 assert.throws(()=>valid(a),/insufficient_panel_global_evidence/)
 a.feedback.global_rating={score:null,band:null,basis:'The primary reflection responses are unavailable.'};valid(a);assert.equal(a.feedback.domains.find(d=>d.key==='motivation_medicine')!.score,5)
})
test('tutor-reviewed empty responses become explicit panel evidence instead of missing transcripts',()=>{
 const members=panelMembers()
 Object.assign(members[8],{transcript:null,transcription_status:'failed',response_disposition:'insubstantial'})
 Object.assign(members[9],{transcript:null,transcription_status:'failed',response_disposition:'not_answered'})
 const source=wholePanelSource(members,panelSession,panelOwner)
 assert.equal(source.sequences[8].availability,'available')
 assert.equal(source.sequences[8].response_disposition,'insubstantial')
 assert.equal(source.sequences[9].response_disposition,'not_answered')
 assert.match(source.sequences[8].references.find(r=>r.speaker==='recording_note')!.text,/insubstantial response/)
 assert.match(source.sequences[9].references.find(r=>r.speaker==='recording_note')!.text,/did not answer/)
 assert.match(source.limitation,/tutor listened to and classified Q9 \(insubstantial\), Q10 \(not answered\)/)
 const a=panelFixture()
 a.source=source
 a.feedback.evidence_scope.limitation=source.limitation
 a.feedback.question_coverage[8].coverage='partly_addressed'
 a.feedback.question_coverage[8].observation='You gave too little assessable content to answer this question fully.'
 a.feedback.question_coverage[9].coverage='not_addressed'
 a.feedback.question_coverage[9].observation='You did not provide an answer to this question.'
 validateWholePanelFeedback(a.feedback,a.source,a.plan)
 a.feedback.question_coverage[9].coverage='not_assessable'
 a.feedback.global_rating={score:null,band:null,basis:'The test deliberately supplies an invalid coverage state.'}
 assert.throws(()=>validateWholePanelFeedback(a.feedback,a.source,a.plan),/invalid_panel_missing_response/)
})
test('explicit complete narrow panels can be scoped without invented missing domains; excerpts cannot be scored globally',()=>{
 const a=panelFixture();a.source.sequences=a.source.sequences.slice(0,2);a.source.limitation='Explicit complete two-question practice panel.';a.plan.tasks=a.plan.tasks.slice(0,2);a.feedback.question_coverage=a.feedback.question_coverage.slice(0,2);valid(a)
 a.source.completeness='excerpt';a.feedback.evidence_scope.completeness='excerpt';assert.throws(()=>valid(a));a.feedback.global_rating={score:null,band:null,basis:'This is an excerpt.'};valid(a)
})
test('all seventeen supplied synthetic cases are retained for regression review without invented human reference scores',()=>{
 const pack=readFileSync('docs/rubrics/panel-v1/Panel_Validation_Pack.md','utf8'),cases=[...pack.matchAll(/^### (\d{2}) — (.+)\n([\s\S]*?)(?=\n### |\n## |(?![\s\S]))/gm)]
 assert.equal(cases.length,17);assert.deepEqual(cases.map(c=>Number(c[1])),Array.from({length:17},(_,i)=>i+1));for(const c of cases){assert.match(c[3],/\*\*Input/);assert.match(c[3],/\*\*Expected:/)}
 assert.match(pack,/No independent model evaluation or human calibration study has been completed/)
})

const seedPack=readFileSync('docs/rubrics/panel-v1/Panel_Validation_Pack.md','utf8')
for(const match of seedPack.matchAll(/^### (\d{2}) — (.+)\n([\s\S]*?)(?=\n### |\n## |(?![\s\S]))/gm)){
 const [,id,title,body]=match,input=body.split('**Expected:**')[0].trim()
 test(`synthetic seed ${id}: source fidelity and prompt isolation — ${title}`,()=>{
  const members=panelMembers();members[0].transcript=input
  const source=wholePanelSource(members,panelSession,panelOwner),sequence=source.sequences[0]
  assert.equal(sequence.transcript,input)
  for(const ref of sequence.references.filter(r=>r.speaker!=='prompt')){assert.ok(ref.start!==null&&ref.end!==null);assert.equal(input.slice(ref.start!,ref.end!),ref.text)}
  assert.ok(!JSON.stringify(panelPlanInput(source)).includes(input))
  // These are evidence-transport checks only, not model/human rating agreement.
  assert.ok(!JSON.stringify(source).includes(body.split('**Expected:**')[1].trim()))
 })
}

test('six saved panel responses retain question numbering and cannot produce a complete-panel score',()=>{
 const members=panelMembers().slice(0,6),source=wholePanelSource(members,panelSession,panelOwner)
 assert.equal(source.completeness,'excerpt');assert.match(source.limitation,/Q7, Q8, Q9, Q10/)
 assert.deepEqual(source.sequences.map(s=>s.id),['Q1','Q2','Q3','Q4','Q5','Q6'])
 const a=panelFixture(members);assert.equal(a.source.completeness,'excerpt')
 a.feedback.global_rating={score:5,band:'Good',basis:'An overall score'}
 assert.throws(()=>valid(a),/insufficient_panel_global_evidence/)
 a.feedback.global_rating={score:null,band:null,basis:'Four responses were not supplied.'};valid(a)
 const sparse=wholePanelSource([panelMembers()[0],panelMembers()[5]],panelSession,panelOwner)
 assert.deepEqual(sparse.sequences.map(s=>s.id),['Q1','Q6'])
})
