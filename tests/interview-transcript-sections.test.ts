import {test} from 'node:test'
import assert from 'node:assert/strict'
import {transcriptUnits,layoutFromAssignments,validTranscriptLayout,questionTranscriptSections} from '../src/lib/interviews/transcript-sections'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url)
const React=require('react');Object.assign(globalThis,{React})
const {renderToStaticMarkup}=require('react-dom/server')
const {InterviewTranscriptText}=require('../src/components/interviews/transcript-text')
const questions=['How would you respond?','What did you learn?','What would you change?']
test('question grouping preserves every character, repeated answers and uncertain passages',()=>{
 const text='I would listen first.  I learnt to ask for help.\nI would then explain the options.  Anyway, can you hear me?'
 const units=transcriptUnits(text)
 assert.equal(units.length,4)
 assert.equal(units.map(unit=>unit.text).join(''),text)
 const layout=layoutFromAssignments(text,questions,{question_indices:[0,1,0,null]})
 assert.equal(layout.spans.map(span=>text.slice(span.start,span.end)).join(''),text)
 const groups=questionTranscriptSections(text,questions,layout)
 assert.equal(groups[0].passages.length,2);assert.equal(groups[2].passages.length,0)
 assert.equal(groups[3].questionIndex,null)
 const html=renderToStaticMarkup(React.createElement(InterviewTranscriptText,{text,questions,layout}))
 assert.match(html,/How would you respond/);assert.match(html,/What did you learn/)
 assert.match(html,/No matching passage was identified/);assert.match(html,/Other parts of your response/)
 assert.match(html,/View full transcript in recording order/)
})
test('invalid grouping cannot drop, duplicate, invent or mislabel transcript text',()=>{
 const text='First answer. Second answer.'
 for(const value of [{question_indices:[0]},{question_indices:[0,9]},{question_indices:[0,0,0]},{question_indices:['0',1]},{}]) assert.throws(()=>layoutFromAssignments(text,questions,value))
 for(const spans of [[{start:1,end:text.length,questionIndex:0}],[{start:0,end:9,questionIndex:0},{start:8,end:text.length,questionIndex:1}],[{start:0,end:text.length+1,questionIndex:0}]]) assert.equal(validTranscriptLayout({version:1,spans},text,questions),false)
 const unicode='  I listened 👩🏽‍⚕️.\n\nThen I asked why.  '
 assert.equal(transcriptUnits(unicode).map(unit=>unit.text).join(''),unicode)
 const long='word '.repeat(150)
 assert.ok(transcriptUnits(long).length>1);assert.equal(transcriptUnits(long).map(unit=>unit.text).join(''),long)
})
test('single questions and unavailable grouping remain readable without fabricated answer headings',()=>{
 const html=renderToStaticMarkup(React.createElement(InterviewTranscriptText,{text:'My entire answer.',questions:['Why medicine?']}))
 assert.match(html,/Why medicine/);assert.match(html,/My entire answer/)
 const raw=renderToStaticMarkup(React.createElement(InterviewTranscriptText,{text:'Original text.',questions,layout:{bad:true}}))
 assert.match(raw,/Original text/);assert.ok(!raw.includes('Question 1'))
})
