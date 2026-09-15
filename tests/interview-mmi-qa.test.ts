import {test} from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {mmiFixture} from './helpers/mmi-v2-fixture'
import {setMMIDomainRating} from '../src/lib/interviews/mmi-editor-state'
import {validateMMIFeedback} from '../src/lib/interviews/mmi-feedback'
import {MMIStudentFeedback,MMIFullMockFeedback} from '../src/components/interviews/mmi-feedback-view'
import {mmiClosing} from '../src/lib/interviews/mmi-summary'
Object.assign(globalThis,{React})
test('unscoring a domain removes dependent highlights and the last global score without changing source evidence',()=>{
 const original=mmiFixture(5),before=structuredClone(original)
 const next=setMMIDomainRating(original,'insight_reflection',null)
 assert.deepEqual(original,before);assert.equal(next.domains[0].status,'insufficient_evidence');assert.equal(next.global.score,null)
 assert.deepEqual(next.strengths,[]);assert.deepEqual(next.priorities,[])
 assert.deepEqual(next.domains[0].evidence,original.domains[0].evidence);assert.deepEqual(next.source,original.source)
 assert.doesNotThrow(()=>validateMMIFeedback(next,{draft:true}))
 assert.throws(()=>validateMMIFeedback(next),/incomplete_mmi_domain/)
 next.domains[0].needed_evidence='The missing part of the response.'
 assert.doesNotThrow(()=>validateMMIFeedback(next))
})
test('a changed score preserves unrelated domains and feedback',()=>{
 const original=structuredClone(mmiFixture(5))
 original.specification.primary_domains.push({key:'communication_rapport',reason:'Clear explanation is requested.'})
 original.domains.push({...structuredClone(original.domains[0]),key:'communication_rapport'})
 original.strengths.push({...original.strengths[0],domain:'communication_rapport'})
 const next=setMMIDomainRating(original,'insight_reflection',null)
 assert.equal(next.global.score,5);assert.deepEqual(next.domains[1],original.domains[1])
 assert.deepEqual(next.strengths,[original.strengths[1]])
 const rated=setMMIDomainRating(original,'insight_reflection',6)
 assert.equal(rated.domains[0].score,6);assert.deepEqual(rated.strengths,original.strengths)
})
test('individual circuit reports attribute concerns to the correct station and standalone reports invent no station number',()=>{
 const f=mmiFixture(5)
 f.concerns=[{id:'C1',status:'clarification_needed',certainty:'uncertain',description:'The plan needs clarification.',consequence:'The outcome is unclear.',repair:'Check the response.',evidence:[{kind:'paraphrase',speaker:'candidate',text:'Describes checking the plan.',references:['T2']}]}]
 const html=renderToStaticMarkup(React.createElement(MMIStudentFeedback,{feedback:f,stationLabel:'Station 6'}))
 assert.match(html,/Station 6 — clarification needed/);assert.doesNotMatch(html,/Station 1 —/)
 assert.doesNotMatch(mmiClosing(f),/Station 1/)
 const circuit=renderToStaticMarkup(React.createElement(MMIFullMockFeedback,{entries:[{id:'station-six',index:5,title:'Sixth station',status:'released',feedback:f}],total:6}))
 assert.equal((circuit.match(/Station 6 — clarification needed/g)??[]).length,2)
 assert.doesNotMatch(circuit,/Station 1 — clarification needed/)
})
