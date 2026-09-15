import {test} from 'node:test'
import assert from 'node:assert/strict'
import {formatRecordingDate,reviewLibrary,reviewHref,type ReviewResponse} from '../src/lib/interviews/review-library'
import {fullMockMarkingCredits,stationMarkingCredits} from '../src/lib/interviews/mock-marking'
const fixture:ReviewResponse[]=Array.from({length:50},(_,i)=>({id:String(i),format:i%2?'mmi':'panel',title:`Response ${i}`,createdAt:new Date(Date.UTC(2026,8,1,0,i)).toISOString(),duration:60,mock:null,status:i%3?'saved':'feedback',eligible:i%3!==0}))
test('50 responses stay in bounded pages; filters, search and return links preserve context',()=>{
 const first=reviewLibrary(fixture,{});assert.equal(first.items.length,10);assert.equal(first.pages,5);assert.equal(first.items[0].id,'49')
 const last=reviewLibrary(fixture,{page:'999'});assert.equal(last.page,5);assert.equal(last.items.length,10)
 assert.equal(reviewLibrary(fixture,{page:'-5'}).page,1)
 const filtered=reviewLibrary(fixture,{format:'mmi',status:'feedback'});assert.ok(filtered.items.every(e=>e.format==='mmi'&&e.responses[0].status==='feedback'))
 assert.equal(reviewLibrary(fixture,{q:'Response 49'}).count,1);assert.equal(reviewLibrary(fixture,{q:'missing'}).count,0)
 assert.equal(reviewHref({q:'a & b',page:'3'},{attempt:'49'}),'/interviews/mock-interviews/review?q=a+%26+b&page=3&attempt=49')
})
test('full mocks occupy one row and remain complete when searching a question',()=>{
 const rows=fixture.slice(0,8).map((r,index)=>({...r,title:index===2?'Unique grouped station':r.title,format:'mmi' as const,mock:{id:'group',mode:'full' as const,index,total:8}}))
 const result=reviewLibrary([...fixture.slice(8),...rows],{q:'Unique grouped station'})
 const group=result.items.find(e=>e.id==='group')!;assert.equal(group.responses.length,8);assert.equal(group.title,'Full MMI · 8 stations')
 assert.deepEqual(group.responses.map(r=>r.mock!.index),[0,1,2,3,4,5,6,7])
})
test('pricing quotes charge 2/1 for stations and 12 total for either full mock, preserving earlier spend',()=>{
 assert.equal(stationMarkingCredits('mmi'),2);assert.equal(stationMarkingCredits('panel'),1)
 assert.equal(fullMockMarkingCredits([{marking_status:null,credits_spent:0}]),12)
 assert.equal(fullMockMarkingCredits([{marking_status:'queued',credits_spent:2},{marking_status:null}]),10)
 assert.equal(fullMockMarkingCredits([{marking_status:'queued',credits_spent:16},{marking_status:null}]),0)
 assert.equal(fullMockMarkingCredits([{marking_status:'released',credits_spent:1}]),0)
})

test('the 50-response library renders ten rows and no players; opening a response mounts one player',async()=>{
 const React=await import('react'),{renderToStaticMarkup}=await import('react-dom/server')
 const {AppRouterContext}=await import('next/dist/shared/lib/app-router-context.shared-runtime.js')
 const {InterviewAttemptReview}=await import('../src/components/interview-attempt-review')
 const library=reviewLibrary(fixture,{})
 const render=(selected:unknown)=>renderToStaticMarkup(React.createElement(AppRouterContext.Provider,{value:{refresh(){}} as never},React.createElement(InterviewAttemptReview,{library,query:{},selected:selected as never,credits:20,responseCount:50})))
 const list=render(null);assert.equal((list.match(/<li /g)??[]).length,10);assert.equal((list.match(/<(video|audio)\b/g)??[]).length,0)
 const detail=render({id:'49',format:'mmi',stationId:'fixture',stationTitle:'Fixture',questions:[],durationSeconds:60,createdAt:fixture[49].createdAt,audioUrl:'https://example.invalid/private-video',transcript:null,transcriptionStatus:'not_requested',kind:'video',events:[],markingLabel:'Saved',expired:false,eligible:true,feedback:null})
 assert.equal((detail.match(/<video\b/g)??[]).length,1);assert.match(detail,/Submit for marking · 2 credits/)
})

test('recording dates match the Sydney calendar across midnight and daylight saving',()=>{
 assert.equal(formatRecordingDate('2026-09-05T14:30:00Z'),'6 Sept 2026, 12:30 am')
 assert.equal(formatRecordingDate('2026-12-05T13:30:00Z'),'6 Dec 2026, 12:30 am')
})
