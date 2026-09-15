import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { makeMockSteps, mockOptions, mockView } from '../src/lib/interviews/mock-plan'
import { INTERVIEW_STATIONS } from '../src/lib/interviews/stations'
import { stationSnapshot } from '../src/lib/interviews/video-validation'
import type { MockSelection, MockTicket } from '../src/lib/interviews/mock-types'
const require=createRequire(import.meta.url)
const {registerHooks}=require('node:module')
registerHooks({resolve(specifier:string,context:object,next:(s:string,c:object)=>object){return next(specifier==='server-only'?resolve('tests/helpers/server-only.cjs'):specifier,context)}})
const {startMockSession,readMockSession,mockAttemptId}=require('../src/lib/interviews/mock-session') as typeof import('../src/lib/interviews/mock-session')
function ticket(selection:MockSelection):MockTicket{return {version:1,id:'session',userId:'student',startedAt:100000,format:selection.format,mode:selection.mode,steps:makeMockSteps(selection,()=>0.5)}}
test('full mocks contain unique responses with exact requested durations',()=>{
 for(const format of ['mmi','panel'] as const){
  const t=ticket({format,mode:'full'}),count=format==='mmi'?8:10
  assert.equal(t.steps.length,count)
  assert.equal(new Set(t.steps.map(s=>`${s.stationId}:${s.questionIndex}`)).size,count)
  const duration=t.steps.reduce((n,s)=>n+s.preparationSeconds+s.responseSeconds,0)
  assert.equal(duration,format==='mmi'?4800:1200)
  assert.equal(mockView(t,t.startedAt+duration*1000).phase,'complete')
  assert.deepEqual(mockView(t,t.startedAt+duration*1000).questions,[])
 }
 assert.throws(()=>makeMockSteps(undefined as unknown as MockSelection))
 assert.throws(()=>makeMockSteps({format:'panel',mode:'individual',selectionId:'forged'}))
})
test('panel mocks require a full interview while individual practice retains canonical questions',()=>{
 const panel=INTERVIEW_STATIONS.filter(s=>s.format==='panel')
 assert.equal(mockOptions().filter(o=>o.format==='panel').length,0)
 for(const station of panel)for(let i=0;i<station.questions.length;i++){
  assert.throws(()=>ticket({format:'panel',mode:'individual',selectionId:`${station.id}:${i}`}),/full interviews/)
  assert.deepEqual(stationSnapshot('panel',station.id,i).questions,[station.questions[i]])
 }
})
test('MMI reveals only the current scenario at timed reading and follow-ups at response time',()=>{
 const t=ticket({format:'mmi',mode:'full'}),first=INTERVIEW_STATIONS.find(s=>s.id===t.steps[0].stationId)!
 assert.equal(mockView(t,t.startedAt).preparation,first.preparation)
 assert.equal(mockView(t,t.startedAt).questionCount,first.questions.length)
 assert.deepEqual(mockView(t,t.startedAt+119999).questions,[])
 assert.deepEqual(mockView(t,t.startedAt+120000).questions,first.questions)
 assert.equal(mockView(t,t.startedAt+599999).index,0)
 const next=mockView(t,t.startedAt+600000)
 assert.equal(next.index,1);assert.equal(next.phase,'preparation');assert.deepEqual(next.questions,[])
 for(const step of t.steps.slice(1)){
  const station=INTERVIEW_STATIONS.find(s=>s.id===step.stationId)!
  assert.ok(!JSON.stringify(mockView(t,t.startedAt)).includes(station.preparation))
 }
 const p=ticket({format:'panel',mode:'full'})
 assert.equal(mockView(p,p.startedAt).phase,'response')
 assert.equal(mockView(p,p.startedAt+119999).index,0)
 assert.equal(mockView(p,p.startedAt+120000).index,1)
 assert.equal(mockView(p,p.startedAt+1199999).index,9)
})
test('tickets reject tampering, other accounts and expiry; retries retain the response identity',()=>{
 const previous=process.env.INTERVIEW_WORKER_SECRET
 try{
  process.env.INTERVIEW_WORKER_SECRET='test-only-secret'.repeat(4)
  const {ticket:t,token}=startMockSession('student',{format:'panel',mode:'full'},100000)
  assert.deepEqual(readMockSession(token,'student',100001),t)
  // Previously issued 30-minute tickets retain their original timing and recording identities.
  const legacy={...t,steps:t.steps.map(s=>({...s,responseSeconds:180}))}
  const legacyBody=Buffer.from(JSON.stringify(legacy)).toString('base64url')
  const legacyToken=legacyBody+'.'+createHmac('sha256',process.env.INTERVIEW_WORKER_SECRET!).update('mock-session-v1:'+legacyBody).digest('base64url')
  const restored=readMockSession(legacyToken,'student',100001)
  assert.equal(mockView(restored,t.startedAt+120000).index,0)
  assert.equal(mockView(restored,t.startedAt+1800000).phase,'complete')
  assert.equal(mockAttemptId(restored,0),mockAttemptId(t,0))
  assert.throws(()=>readMockSession(token,'other',100001))
  assert.throws(()=>readMockSession(token,'student',t.startedAt+7*86400000+1))
  const body=Buffer.from(JSON.stringify({...t,startedAt:0})).toString('base64url')
  assert.throws(()=>readMockSession(`${body}.${token.split('.')[1]}`,'student',100001))
  assert.throws(()=>readMockSession(`${token}x`,'student',100001))
  assert.equal(mockAttemptId(t,0),mockAttemptId(readMockSession(token,'student',100001),0))
  assert.notEqual(mockAttemptId(t,0),mockAttemptId(t,1))
  delete process.env.INTERVIEW_WORKER_SECRET
  assert.throws(()=>startMockSession('student',{format:'mmi',mode:'full'}))
 }finally{if(previous===undefined)delete process.env.INTERVIEW_WORKER_SECRET;else process.env.INTERVIEW_WORKER_SECRET=previous}
})
test('lobby metadata and setup HTML contain no scenario or question wording',()=>{
 const React=require('react');Object.assign(globalThis,{React})
 const {renderToStaticMarkup}=require('react-dom/server')
 const {MockInterviewLobby}=require('../src/components/interviews/mock-lobby')
 const {MockSessionRunner}=require('../src/components/interviews/mock-session-runner')
 const metadata=JSON.stringify(mockOptions())
 assert.ok(metadata.includes(INTERVIEW_STATIONS.find(station=>station.format==='mmi')!.category))
 const {AppRouterContext}=require('next/dist/shared/lib/app-router-context.shared-runtime')
 const renderLobby=(credits:number|null)=>renderToStaticMarkup(React.createElement(AppRouterContext.Provider,{value:{refresh:()=>{}}},React.createElement(MockInterviewLobby,{options:mockOptions(),enabled:true,userId:'student',credits})))
 assert.match(renderLobby(20),/20 credits available/)
 assert.match(renderLobby(0),/0 credits available/)
 assert.match(renderLobby(null),/Balance unavailable/)
 assert.ok(!renderLobby(null).includes('0 credits available'))
 assert.match(renderLobby(20),/Station theme/)
 assert.match(renderLobby(20),/A timed scenario exploring/)
 const html=renderLobby(20)+
 renderToStaticMarkup(React.createElement(MockSessionRunner,{selection:{format:'mmi',mode:'full'},enabled:true,userId:'student'}))+
 renderToStaticMarkup(React.createElement(MockSessionRunner,{selection:{format:'panel',mode:'full'},enabled:true,userId:'student'}))
 assert.match(html,/10 questions · 20 minutes · 2 minutes per question/)
 for(const station of INTERVIEW_STATIONS)for(const prompt of [station.preparation,...station.questions]){
  assert.ok(!metadata.includes(prompt))
  const escaped=renderToStaticMarkup(React.createElement('span',null,prompt)).slice(6,-7)
  assert.ok(!html.includes(escaped),`Prompt leaked from ${station.id}`)
 }
})

test('marking explanation focuses on credit-funded review and strengths and weaknesses',()=>{
 const React=require('react');Object.assign(globalThis,{React})
 const {renderToStaticMarkup}=require('react-dom/server')
 const {AppRouterContext}=require('next/dist/shared/lib/app-router-context.shared-runtime')
 const {InterviewStudentActions}=require('../src/components/interviews/student-actions')
 const html=renderToStaticMarkup(React.createElement(AppRouterContext.Provider,{value:{refresh:()=>{}}},React.createElement(InterviewStudentActions,{id:'attempt',eligible:true,credits:0,format:'mmi'})))
 assert.match(html,/Interview marking credits/);assert.match(html,/Submit for marking · 2 credits/)
 assert.ok(!html.includes('AI'));assert.ok(!html.includes('Raw automated'));assert.ok(!html.includes('You have'))
})
