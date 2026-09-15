import {test} from 'node:test'
import assert from 'node:assert/strict'
import {chooseContinueAction,readContinueState,rememberPractice,forgetPractice,markFeedbackRead} from '../src/lib/interviews/continue-practice'
import {INTERVIEW_STATIONS} from '../src/lib/interviews/stations'
import type {MockDraft} from '../src/lib/interviews/mock-local'
const station=INTERVIEW_STATIONS.find(s=>s.format==='panel')!,now=Date.now()
const practice={stationId:station.id,format:station.format,questionIndex:1,updatedAt:now}
const feedback=[{id:'attempt:one',title:'Ethics feedback',href:'/interviews/mock-interviews/review?attempt=one',releasedAt:new Date(now).toISOString()}]
const draft=(userId='owner',saved=false):MockDraft=>({id:'draft',userId,token:'not-returned',format:'mmi',mode:'full',total:8,startedAt:now,ended:true,segments:[{index:0,title:'Station',durationSeconds:120,saved}]})
test('continue card prioritises unsaved recordings, unread feedback, then a valid unfinished question',()=>{
 const state={seen:[],practice}
 const recording=chooseContinueAction('owner',[draft()],feedback,state,now)!
 assert.equal(recording.kind,'recording');assert.match(recording.href,/draft=draft/);assert.ok(!JSON.stringify(recording).includes('not-returned'))
 assert.equal(chooseContinueAction('owner',[draft('owner',true)],feedback,state,now)?.kind,'feedback')
 const question=chooseContinueAction('owner',[],feedback,{...state,seen:['attempt:one']},now)!
 assert.equal(question.kind,'practice');assert.match(question.href,/question=1/);assert.match(question.description,/fresh timer/)
})
test('no card for a fresh account, seen reports, completed drafts, old or invalid practice; other accounts are excluded',()=>{
 assert.equal(chooseContinueAction('owner',[draft('other')],[],{seen:[]},now),null)
 assert.equal(chooseContinueAction('owner',[draft('owner',true)],feedback,{seen:['attempt:one']},now),null)
 for(const p of [{...practice,updatedAt:now-8*86400000},{...practice,updatedAt:now+1000},{...practice,stationId:'removed'},{...practice,questionIndex:999},{...practice,questionIndex:-1}])assert.equal(chooseContinueAction('owner',[],[],{seen:[],practice:p},now),null)
})
test('the newest actionable item is selected, without letting a newer saved mock hide an older unsaved recording',()=>{
 const older={...draft(),id:'older',startedAt:now-10},newer={...draft('owner',true),id:'newer'}
 assert.match(chooseContinueAction('owner',[newer,older],[],{seen:[]},now)!.href,/draft=older/)
 assert.equal(chooseContinueAction('owner',[],[{...feedback[0],id:'old',releasedAt:'2025-01-01'},...feedback],{seen:[]},now)?.title,'Ethics feedback')
})
test('account-scoped browser state clears only the same practice and acknowledges each feedback item once',()=>{
 const previousStorage=Object.getOwnPropertyDescriptor(globalThis,'localStorage'),previousWindow=Object.getOwnPropertyDescriptor(globalThis,'window'),store=new Map<string,string>()
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>store.get(k)??null,setItem:(k:string,v:string)=>store.set(k,v)}})
 Object.defineProperty(globalThis,'window',{configurable:true,value:{dispatchEvent(){}}})
 try{
  rememberPractice('one',practice);assert.equal(readContinueState('two').practice,undefined)
  forgetPractice('one',station.id,1,now-1);assert.deepEqual(readContinueState('one').practice,practice)
  markFeedbackRead('one','attempt:one');markFeedbackRead('one','attempt:one');assert.deepEqual(readContinueState('one').seen,['attempt:one'])
  forgetPractice('one',station.id,1,now);assert.equal(readContinueState('one').practice,undefined);assert.deepEqual(readContinueState('one').seen,['attempt:one'])
  store.set('interview-continue-v1:one','broken');assert.deepEqual(readContinueState('one'),{seen:[]})
 }finally{if(previousStorage)Object.defineProperty(globalThis,'localStorage',previousStorage);else Reflect.deleteProperty(globalThis,'localStorage');if(previousWindow)Object.defineProperty(globalThis,'window',previousWindow);else Reflect.deleteProperty(globalThis,'window')}
})
