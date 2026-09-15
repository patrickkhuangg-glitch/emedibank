import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mockPostMortem} from '../src/lib/mock/report/postmortem'
import {visibleMockReport} from '../src/lib/mock/report/analyse'
import type {ReportFact,ReportHistory} from '../src/lib/mock/report/types'
const q=(id:string,patch:Partial<ReportFact>={}):ReportFact=>({id,number:1,section:'quantitative-reasoning',sectionName:'QR',type:'Tables',setId:id,maximum:1,score:0,answered:true,seconds:30,budget:100,firstSeen:0,finalAt:95,changes:0,firstScore:0,partialResponse:false,format:'mcq',difficulty:'easy',...patch})
test('opportunities do not double-count overlapping easy slow unanswered and repeated errors',()=>{
 const facts=[q('1',{answered:false,seconds:100}),q('2',{seconds:100}),q('3',{difficulty:'hard',seconds:100}),q('4',{difficulty:'hard',seconds:10}),q('5',{difficulty:null,seconds:10,score:.5})]
 const annotations=[{questionId:'4',category:'Calculation error' as const}]
 const p=mockPostMortem(facts,[],[{facts,annotations},{facts:[q('old')],annotations:[{questionId:'old',category:'Calculation error'}]}])
 assert.deepEqual(p.opportunities.rows.map(r=>r.marks),[1,1,1,1]);assert.equal(p.opportunities.total,4);assert.equal(p.opportunities.other,.5);assert.equal(p.easy.marks,2);assert.equal(p.easy.unknownDifficulty,1);assert.equal(p.opportunities.estimated,null)
})
test('history estimate excludes current IDs and repeated copies, requires five distinct comparable answers, handles partial credit',()=>{
 const facts=[q('target',{maximum:2,score:.5})],sample=Array.from({length:5},(_,i)=>q('past'+i,{score:i<4?1:0}))
 let p=mockPostMortem(facts,[],undefined,[...sample,...sample,q('target',{score:1})]);assert.equal(p.opportunities.estimated,1.1);assert.equal(p.opportunities.covered,1)
 p=mockPostMortem(facts,[],undefined,[...sample.slice(0,4),...sample.slice(0,4),q('target',{score:1})]);assert.equal(p.opportunities.estimated,null)
 p=mockPostMortem(facts,[],undefined,sample.map(q=>({...q,difficulty:'hard'})));assert.equal(p.opportunities.estimated,null)
})
test('repeat reasons require another mock, current labels alone do not create a recurring category',()=>{
 const facts=[q('1',{difficulty:'hard'}),q('2',{difficulty:'hard'})],annotations=facts.map(q=>({questionId:q.id,category:'Guessed' as const}))
 const p=mockPostMortem(facts,[],[{facts,annotations}]);assert.equal(p.opportunities.rows.find(r=>r.key==='repeated')!.marks,0);assert.equal(p.reasons[0].repeated,false)
})
test('best and largest sections use proportions; three sessions and no invented comparison',()=>{
 const facts=[q('1',{score:1}),q('2',{score:0}),q('3',{section:'decision-making',sectionName:'DM',maximum:2,score:1.5})]
 const p=mockPostMortem(facts);assert.equal(p.best[0].name,'DM');assert.equal(p.largest[0].name,'QR');assert.equal(p.sessions.length,3);assert.equal(p.comparison,null)
 assert.equal(mockPostMortem([]).sessions.length,0)
})
test('visible report compares immediately previous attempt, excludes current/future, keeps paid analytics private',()=>{
 const h=(id:string,date:string):ReportHistory=>({id,label:id,completedAt:date,accuracy:50,seconds:10,sections:[{slug:'quantitative-reasoning',accuracy:50,scaled:600}],sameForm:false})
 const history=[h('newer','2026-09-08'),h('current','2026-09-09'),h('old','2026-09-01'),h('future','2026-09-10')]
 const p=visibleMockReport('current','Mock','2026-09-09',[q('1')],true,history);assert.equal(p.paid!.postMortem.comparison!.label,'newer')
 const free=visibleMockReport('current','Mock','2026-09-09',[q('1')],false,history);assert.equal(free.paid,null);assert(!JSON.stringify(free).includes('opportunities'))
})
