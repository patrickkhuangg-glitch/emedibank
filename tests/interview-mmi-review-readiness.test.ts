import { test } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { mmiFixture } from './helpers/mmi-v2-fixture'
import { mmiReviewIssues } from '../src/lib/interviews/mmi-review-readiness'
import { MMIReviewGuide } from '../src/components/interviews/mmi-review-guide'
import { MMIStudentDraft } from '../src/components/interviews/mmi-student-draft'
Object.assign(globalThis,{React})

test('review guidance accepts valid unscored work and does not require invented strengths',()=>{
 assert.deepEqual(mmiReviewIssues(mmiFixture(null)),[])
 const value=mmiFixture(5); const before=structuredClone(value)
 assert.deepEqual(mmiReviewIssues(value),[]); assert.deepEqual(value,before)
 const html=renderToStaticMarkup(React.createElement(MMIReviewGuide,{value,audit:null,watched:false,locked:false}))
 assert.match(html,/Required fields filled. Review the wording and scores/)
 assert.match(html,/Audit unavailable/);assert.match(html,/Draft text still needs your review/)
 assert.doesNotMatch(html,/Ready to release/)
})
test('missing student and tutor fields have actionable targets; invalid evidence still requires attention',()=>{
 const value=mmiFixture(null);value.domains[0].needed_evidence=' ';value.closing.verdict=''
 assert.deepEqual(mmiReviewIssues(value).map(i=>i.target),['mmi-needed-insight_reflection','mmi-overall-feedback'])
 const scored=mmiFixture(5);scored.priorities[0].text='';scored.domains[0].improvement=''
 assert.deepEqual(mmiReviewIssues(scored).map(i=>i.target),['mmi-detailed-editor','mmi-priorities-0'])
 const invalid=mmiFixture(5);invalid.strengths[0].references=['unknown']
 assert.equal(mmiReviewIssues(invalid)[0].target,'mmi-detailed-editor')
})
test('student fields show missing-text prompts and distinguish visible unscored explanations from private scoring notes',()=>{
 const value=mmiFixture(null);value.closing.verdict=''
 const html=renderToStaticMarkup(React.createElement(MMIStudentDraft,{value,onChange:()=>{}}))
 assert.match(html,/Needs writing/);assert.match(html,/id="mmi-overall-feedback"[^>]*aria-invalid="true"/)
 assert.match(html,/student sees this explanation/);assert.match(html,/Scoring basis · tutor only/)
 assert.match(html,/Student sees this explanation of what is missing/)
 assert.match(html,/No points added. Include only points supported by this response/)
 const scored=renderToStaticMarkup(React.createElement(MMIStudentDraft,{value:mmiFixture(5),onChange:()=>{}}))
 assert.match(scored,/Reason for the overall score · tutor only/)
})
