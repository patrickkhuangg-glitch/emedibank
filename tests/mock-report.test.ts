import { test } from 'node:test'
import assert from 'node:assert/strict'
import { analyseMock, visibleMockReport } from '../src/lib/mock/report/analyse'
import { MockTelemetry } from '../src/lib/mock/report/telemetry'
import type { ReportFact } from '../src/lib/mock/report/types'
const fact = (id:string, patch:Partial<ReportFact> = {}):ReportFact => ({id,number:Number(id),section:'decision-making',sectionName:'Decision Making',type:'Syllogisms',setId:id,maximum:2,score:2,answered:true,seconds:30,budget:120,firstSeen:0,finalAt:30,changes:0,firstScore:2,partialResponse:false,format:'grid',...patch})
test('free report strips every paid collection and detailed missed-mark allocation',()=>{
 const r=visibleMockReport('r','Mock','2026-09-09', [fact('1',{score:1})],false)
 assert.equal(r.paid,null);assert.equal(r.core.marks.lost,1);assert.equal(r.core.marks.partial,null)
 assert(!JSON.stringify(r).includes('firstScore'));assert(!JSON.stringify(r).includes('queue'))
})
test('marks buckets partition losses including partial credit and unanswered',()=>{
 const {core,paid}=analyseMock([fact('1',{score:1}),fact('2',{score:0}),fact('3',{score:0,answered:false}),fact('4')])
 assert.deepEqual(core.marks,{lost:5,maximum:8,partial:1,incorrect:2,unanswered:2})
 assert.equal(paid.queue.length,3);assert.equal(paid.queue[0].lost,2);assert.equal(paid.plan.length,7)
})
test('same-named types remain separate across subtests; ties are explicit',()=>{
 const {core,paid}=analyseMock([fact('1'),fact('2',{section:'verbal-reasoning',sectionName:'Verbal Reasoning'})])
 assert.equal(paid.types.length,2);assert(core.strongest.includes(' / '))
})
test('late period uses timestamps, not question number; no answers gives null accuracy',()=>{
 const {paid}=analyseMock([fact('1',{finalAt:110,score:0}),fact('2',{finalAt:10}),fact('3',{finalAt:null,answered:false,score:0})])
 assert.equal(paid.pressure[0].earlyAccuracy,100);assert.equal(paid.pressure[0].lateAccuracy,0);assert.equal(paid.pressure[0].lateUnanswered,1)
 assert.equal(analyseMock([fact('1',{finalAt:null})]).paid.pressure[0].lateAccuracy,null)
})
test('answer-change net marks respect partial credit and neutral changes',()=>{
 const {paid}=analyseMock([fact('1',{changes:1,firstScore:0,score:1}),fact('2',{changes:2,firstScore:2,score:0}),fact('3',{changes:1,firstScore:2})])
 assert.deepEqual(paid.changes,{questions:3,helped:1,hurt:1,neutral:1,netMarks:-1,ids:['1','2','3']})
})
test('telemetry ignores initial grid construction, tracks reversals and isolates snapshots',()=>{
 const t=new MockTelemetry();t.visit('a',5);t.answer('a',{'0':'Yes'},false,8)
 assert.equal(t.snapshot().a.events.length,0)
 t.answer('a',{'0':'Yes','1':'No'},true,10);t.answer('a',{'1':'No','0':'Yes'},true,11)
 assert.equal(t.snapshot().a.events.length,1)
 t.answer('a',{'0':'No','1':'No'},true,15);t.answer('a',{'0':'Yes','1':'No'},true,20)
 assert.equal(t.snapshot().a.events.length,3)
 const s=t.snapshot();s.a.events=[];assert.equal(t.snapshot().a.events.length,3)
})
