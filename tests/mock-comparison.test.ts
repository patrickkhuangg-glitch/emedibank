import {test} from 'node:test'
import assert from 'node:assert/strict'
import {previousMockComparison,historicalScores} from '../src/lib/mock/report/comparison'
import type {ReportHistory,ReportFact} from '../src/lib/mock/report/types'
const h=(id:string,date:string,totalScore:number|null,scaled=700):ReportHistory=>({id,completedAt:date,label:'Mock',accuracy:70,seconds:100,sections:[{slug:'quantitative-reasoning',accuracy:70,scaled}],sameForm:true,totalScore})
test('averages earlier mocks, excludes current and future; positive and negative deltas',()=>{
 const history=[h('a','2026-09-01',2100),h('b','2026-09-02',2200),h('current','2026-09-03',2400),h('future','2026-09-04',2700)]
 assert.deepEqual(previousMockComparison(history,'current','2026-09-03',2400),{count:2,average:2150,delta:250,scores:[2100,2200]})
 assert.equal(previousMockComparison(history,'current','2026-09-03',650,'quantitative-reasoning').delta,-50)
})
test('first mock and missing comparable totals have no invented baseline',()=>{
 assert.equal(previousMockComparison([h('mini','2026-09-01',null)],'current','2026-09-03',2000).average,null)
 assert.equal(previousMockComparison([],'current','2026-09-03',2000).delta,null)
 assert.equal(previousMockComparison([h('a','2026-09-01',2100)],'current','2026-09-03',null).delta,null)
})
test('uses the ten most recent comparable scores in chronological order',()=>{
 const history=Array.from({length:12},(_,i)=>h(String(i),`2026-08-${String(i+1).padStart(2,'0')}`,2000+i*10)).reverse()
 const r=previousMockComparison(history,'current','2026-09-03',2300)
 assert.equal(r.count,10);assert.equal(r.scores[0],2020);assert.equal(r.average,2065)
})
test('historical scoring preserves SJT partial credit and excludes SJT from cognitive total',()=>{
 const rows=[['verbal-reasoning',33,44],['decision-making',37,47],['quantitative-reasoning',27,36],['situational-judgement',53.5,69]].map(([section,score,maximum])=>({section,score,maximum})) as ReportFact[]
 const r=historicalScores(rows);assert.equal(r.totalScore,2260);assert.equal(r.sections.find(s=>s.slug==='situational-judgement')?.scaled,770)
 assert.equal(historicalScores(rows.filter(r=>r.section==='quantitative-reasoning')).totalScore,null)
})
