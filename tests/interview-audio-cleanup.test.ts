import { test } from 'node:test'
import assert from 'node:assert/strict'
import Module, { createRequire } from 'node:module'
import { resolve } from 'node:path'
const require=createRequire(import.meta.url)
const old='2026-09-01T00:00:00Z',now=Date.parse('2026-09-07T00:00:00Z')
const rows=[
 {id:'stale',media_kind:'audio',source:'practice_audio',upload_status:'awaiting_upload',created_at:old,user_id:'owner',recording_path:'owner/stale/practice.webm',transcription_audio_path:null},
 {id:'race',media_kind:'audio',source:'practice_audio',upload_status:'awaiting_upload',created_at:old,user_id:'owner',recording_path:'owner/race/practice.webm',transcription_audio_path:null},
 {id:'saved',media_kind:'audio',source:'practice_audio',upload_status:'ready',created_at:old},
 {id:'legacy',media_kind:'audio',source:null,upload_status:'awaiting_upload',created_at:old},
 {id:'video',media_kind:'video',source:null,upload_status:'awaiting_upload',created_at:old},
]
const removed:string[]=[]
const db={from(){
 const predicates:Array<(row:typeof rows[number])=>boolean>=[];let mode='select'
 const value=(row:typeof rows[number],key:string)=>key==='station_snapshot->>source'?row.source:row[key as keyof typeof row]
 const result=()=>{
  const found=rows.filter(row=>predicates.every(p=>p(row)))
  if(mode==='update'){for(const row of found)row.upload_status='discarded';return {data:found[0]??null,error:null}}
  if(mode==='delete'){for(const row of found)removed.push(row.id);return {data:null,error:null}}
  const snapshot=found.map(row=>({...row}));rows.find(row=>row.id==='race')!.upload_status='ready'
  return {data:snapshot,error:null}
 }
 const chain={select:()=>chain,eq:(key:string,v:unknown)=>{predicates.push(row=>value(row,key)===v);return chain},in:(key:string,v:unknown[])=>{predicates.push(row=>v.includes(value(row,key)));return chain},lt:(key:string,v:string)=>{predicates.push(row=>String(value(row,key))<v);return chain},limit:()=>chain,update:()=>{mode='update';return chain},delete:()=>{mode='delete';return chain},maybeSingle:async()=>result(),then:(resolve:(r:unknown)=>void)=>Promise.resolve(result()).then(resolve)}
 return chain
},rpc:async()=>({data:true,error:null}),storage:{from:()=>({list:async()=>({data:[],error:null}),remove:async()=>({error:null})})}}
const path=require.resolve('../src/lib/supabase/admin.ts'),m=new Module(path);m.filename=path;m.loaded=true;m.exports={createAdminClient:()=>db};require.cache[path]=m
type ResolveHook=(specifier:string,context:object,next:(specifier:string,context:object)=>object)=>object
const {registerHooks}=require('node:module') as {registerHooks:(hooks:{resolve:ResolveHook})=>void}
registerHooks({resolve(specifier,context,next){return next(specifier==='server-only'?resolve('tests/helpers/server-only.cjs'):specifier,context)}})
const {cleanupPracticeAudioUploads}=require('../src/lib/interviews/storage-cleanup.ts')
test('abandoned practice audio is cleaned without touching completed, concurrent-finalised, legacy or video recordings',async()=>{
 await cleanupPracticeAudioUploads(now)
 assert.deepEqual(removed,['stale'])
 assert.equal(rows.find(row=>row.id==='race')!.upload_status,'ready')
})
