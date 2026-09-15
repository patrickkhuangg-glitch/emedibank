import {test} from 'node:test'
import assert from 'node:assert/strict'
import {confidenceForAnswer,confidenceCalibration,summarizeErrors} from '../src/lib/mock/report/reflection'
import {responseKey} from '../src/lib/mock/report/telemetry'
import {timePressureMap} from '../src/lib/mock/report/pressure'
import {visibleMockReport,analyseMock} from '../src/lib/mock/report/analyse'
import type {ReportFact} from '../src/lib/mock/report/types'
const q=(id:string,patch:Partial<ReportFact>={}):ReportFact=>({id,number:Number(id),section:'quantitative-reasoning',sectionName:'Quantitative Reasoning',type:'Tables',setId:id,maximum:1,score:1,answered:true,seconds:35,budget:1560,firstSeen:0,finalAt:1200,completedAt:1200,changes:0,firstScore:1,partialResponse:false,format:'mcq',...patch})
test('confidence is optional and valid only for the chosen response',()=>{
 const record={value:'Confident' as const,answerKey:responseKey('a')}
 assert.equal(confidenceForAnswer(record,'a'),'Confident');assert.equal(confidenceForAnswer(record,'b'),null)
 assert.equal(confidenceForAnswer(undefined,'a'),null)
 assert.equal(confidenceForAnswer({value:'Unsure',answerKey:responseKey({0:'Yes',1:'No'})},{1:'No',0:'Yes'}),'Unsure')
})
test('calibration partitions recorded answers including partial credit; guessed correct enters review queue',()=>{
 const facts=[q('1',{confidence:'Confident',score:0}),q('2',{confidence:'Confident'}),q('3',{confidence:'Unsure'}),q('4',{confidence:'Guessed'}),q('5',{confidence:'Unsure',score:0.5}),q('6',{confidence:'Guessed',score:0}),q('7')]
 const c=confidenceCalibration(facts);assert.equal(c.recorded,6);assert.equal(c.unrecorded,1);assert(c.groups.every(g=>g.count===1))
 assert(analyseMock(facts).paid.queue.some(q=>q.id==='4'&&q.lost===0))
 assert(!analyseMock(facts).paid.queue.some(q=>q.id==='2'))
})
test('strict under-five-minute boundary; initial completion and final change are separate',()=>{
 const p=timePressureMap([q('1',{completedAt:1000,finalAt:1260}),q('2',{completedAt:1000,finalAt:1261,score:0}),q('3',{completedAt:1400,finalAt:1400}),q('4',{answered:false,score:0,completedAt:null,finalAt:null})])[0]
 const five=p.windows.find(w=>w.key==='five')!;assert.equal(five.earlyCount,1);assert.equal(five.lateCount,2);assert.equal(five.completed,1);assert.equal(five.marksLost,1);assert.equal(five.maximum,2)
 assert.equal(p.unansweredMarks,1);assert.equal(five.lateAccuracy,50)
})
test('six-minute period uses real timestamps and no missing data is invented',()=>{
 const p=timePressureMap([q('1',{finalAt:1200}),q('2',{finalAt:null,completedAt:null})])[0]
 assert.equal(p.windows.find(w=>w.key==='six')!.lateCount,1);assert.equal(p.missingTiming,1)
 assert.equal(p.windows.find(w=>w.key==='five')!.lateAccuracy,null)
 assert.equal(p.types[0].recommendedSeconds,780)
})
test('error totals count actual missed marks once per classified question across mocks',()=>{
 const data=summarizeErrors([{facts:[q('1',{score:0}),q('2',{score:0.5}),q('3',{score:0}),q('4')],annotations:[{questionId:'1',category:'Calculation error'},{questionId:'2',category:'Calculation error'},{questionId:'4',category:'Guessed'}]},{facts:[q('1',{score:0})],annotations:[{questionId:'1',category:'Misread the question'}]}])
 assert.equal(data.mocks,2);assert.equal(data.labelledErrors,3);assert.equal(data.unclassifiedErrors,1);assert.equal(data.classifiedMarks,2.5);assert.equal(data.rows.find(r=>r.category==='Calculation error')!.marks,1.5)
})
test('free reports expose own confidence choices but no premium pressure or calibration data',()=>{
 const report=visibleMockReport('r','Mock','2026-09-09',[q('1',{confidence:'Guessed'})],false)
 assert.equal(report.paid,null);assert.equal(report.confidenceChoices?.['1'],'Guessed');assert(!JSON.stringify(report).includes('timePressure'))
})
