import {test} from 'node:test'
import assert from 'node:assert/strict'
import {loadModule} from './helpers/load-module.mjs'
test('temporary audio cleanup surfaces partial failures, preserves retry pointers and continues other removals',async()=>{
 let mode='remove';const removed:string[]=[],updated:string[]=[]
 const rows=[{id:'first',transcription_audio_path:'owner/first/audio.webm'},{id:'second',transcription_audio_path:'owner/second/audio.webm'}]
 const db={from:()=>({select(){const query={eq:()=>query,not:()=>query,limit:async()=>({data:rows,error:null})};return query},update(){let id='';const query={eq:(key:string,value:string)=>{if(key==='id'){id=value;return query}updated.push(id);return Promise.resolve({error:mode==='pointer'&&id==='first'?{message:'synthetic'}:null})}};return query}}),storage:{from:()=>({remove:async(paths:string[])=>{removed.push(paths[0]);return {error:mode==='remove'&&paths[0].includes('/first/')?{message:'synthetic'}:null}}})}}
 const {cleanupTranscriptionAudio}=loadModule('src/lib/interviews/storage-cleanup.ts',{'server-only':{},'@/lib/supabase/admin':{createAdminClient:()=>db}},{console:{warn:()=>{}}}) as {cleanupTranscriptionAudio:()=>Promise<void>}
 await assert.rejects(cleanupTranscriptionAudio,/transcription_audio_cleanup_failed/);assert.equal(removed.length,2);assert.deepEqual(updated,['second'])
 mode='pointer';await assert.rejects(cleanupTranscriptionAudio,/transcription_audio_cleanup_failed/)
 mode='ok';await cleanupTranscriptionAudio()
})
