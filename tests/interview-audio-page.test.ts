import { test } from 'node:test'
import assert from 'node:assert/strict'
import Module, { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const React = require('react')
Object.assign(globalThis, { React })
const { renderToStaticMarkup } = require('react-dom/server')
const { AppRouterContext } = require('next/dist/shared/lib/app-router-context.shared-runtime')
const rows = Array.from({length:12},(_,i)=>({ id:`audio-${i}`,user_id:'owner',media_kind:'audio',format:'panel',station_title:`Practice ${i}`,created_at:'2026-09-06T14:30:00Z',duration_seconds:30,upload_status:'ready',video_deleted_at:null,recording_path:`owner/audio-${i}/practice.webm`,question_events:[{question_index:0,offset_seconds:0}],transcription_status:'ready',transcript:'PRIVATE_AUDIO_TRANSCRIPT' }))
let signed = 0
const filters: Array<Record<string,unknown>> = []
const db = { from(table:string) {
 const where:Record<string,unknown>={};filters.push(where)
 const result=()=>({data:table==='interview_practice_logs'?{self_rating:4}:where.id?rows.find(r=>r.id===where.id):rows,error:null})
 const chain={select:()=>chain,eq:(key:string,value:unknown)=>{where[key]=value;return chain},order:()=>chain,maybeSingle:async()=>result(),then:(resolve:(v:unknown)=>void)=>Promise.resolve(result()).then(resolve)}
 return chain
}, storage:{from:()=>({createSignedUrl:async()=>{signed++;return {data:{signedUrl:'https://example.invalid/private-audio'},error:null}}})} }
function mock(path:string,exports:Record<string,unknown>){const id=require.resolve(path),m=new Module(id);m.filename=id;m.loaded=true;m.exports=exports;require.cache[id]=m}
mock('../src/lib/auth/dal.ts',{requireUser:async()=>({id:'owner'})})
mock('../src/lib/supabase/server.ts',{createClient:async()=>db})
const Page=require('../src/app/(app)/interviews/practice/recordings/page.tsx').default
async function render(params:Record<string,string>){const page=await Page({searchParams:Promise.resolve(params)});return renderToStaticMarkup(React.createElement(AppRouterContext.Provider,{value:{refresh(){}}},page))}

test('practice library paginates metadata privately; only a selected audio response loads playback and transcript',async()=>{
 const list=await render({});assert.equal(signed,0);assert.equal((list.match(/<li /g)??[]).length,10)
 assert.ok(!list.includes('PRIVATE_AUDIO_TRANSCRIPT'));assert.ok(!list.includes('<audio'));assert.match(list,/Practice recordings/)
 assert.ok(filters.every(f=>f.user_id==='owner'&&f.media_kind==='audio'))
 const next=await render({page:'2'});assert.equal((next.match(/<li /g)??[]).length,2)
 filters.length=0
 const selected=await render({attempt:'audio-0'});assert.equal(signed,1);assert.equal((selected.match(/<audio\b/g)??[]).length,1)
 assert.match(selected,/PRIVATE_AUDIO_TRANSCRIPT/);assert.match(selected,/Study notes/);assert.match(selected,/Rate 4 out of 5/)
 assert.ok(!selected.includes('Submit for marking'))
 assert.ok(filters.every(f=>f.user_id==='owner'))
 const missing=await render({attempt:'someone-elses-audio'});assert.equal(signed,1);assert.ok(!missing.includes('PRIVATE_AUDIO_TRANSCRIPT'))
})
