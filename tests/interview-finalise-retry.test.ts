import {test} from 'node:test'
import assert from 'node:assert/strict'
import {loadModule} from './helpers/load-module.mjs'
test('final save retries only transient responses, keeps the same attempt and payload, and stays bounded',async()=>{
 let statuses=[409,503,200],calls=0;const payload={durationSeconds:6,questionEvents:[]}
 const {finaliseInterviewUpload}=loadModule('src/lib/interviews/finalise-upload.ts',{}, {setTimeout:(fn:()=>void)=>setTimeout(fn,0),clearTimeout,fetch:async(url:string,options:{body:string})=>{assert.equal(url,'/api/interviews/attempts/owned-id/finalise');assert.deepEqual(JSON.parse(options.body),payload);calls++;return Response.json({ok:statuses[0]===200},{status:statuses.shift()??503})}}) as {finaliseInterviewUpload:(id:string,b:unknown,s:AbortSignal)=>Promise<Response>}
 const signal=new AbortController().signal
 assert.equal((await finaliseInterviewUpload('owned-id',payload,signal)).status,200);assert.equal(calls,3)
 statuses=[400];calls=0;assert.equal((await finaliseInterviewUpload('owned-id',payload,signal)).status,400);assert.equal(calls,1)
 statuses=[503,503,503,200];calls=0;assert.equal((await finaliseInterviewUpload('owned-id',payload,signal)).status,503);assert.equal(calls,3)
})
test('pausing during final-save backoff stops further requests',async()=>{
 const controller=new AbortController();let calls=0
 const {finaliseInterviewUpload}=loadModule('src/lib/interviews/finalise-upload.ts',{}, {setTimeout:(fn:()=>void)=>{queueMicrotask(()=>controller.abort());return setTimeout(fn,1000)},clearTimeout,fetch:async()=>{calls++;return Response.json({},{status:409})}}) as {finaliseInterviewUpload:(id:string,b:unknown,s:AbortSignal)=>Promise<Response>}
 await assert.rejects(()=>finaliseInterviewUpload('id',{},controller.signal),/Saving paused/);assert.equal(calls,1)
})
