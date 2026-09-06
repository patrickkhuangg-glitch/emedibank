import {test} from 'node:test'
import assert from 'node:assert/strict'
import {loadModule} from './helpers/load-module.mjs'
import {INTRO_STATUSES} from '../src/lib/interviews/introduction'
import {validateStory,validStoryId} from '../src/lib/interviews/stories'
let user:{id:string}|null=null,role='student',authFail=false,saved:unknown=null,row:Record<string,unknown>|null=null,conflict=false,lastWrite:Record<string,unknown>|null=null
const auth={getUser:async()=>user,getProfile:async()=>({role})}
const api=loadModule('src/lib/interviews/api.ts',{'@/lib/auth/dal':auth,'@/lib/supabase/admin':{createAdminClient:()=>null}})
const db={auth:{updateUser:async(data:unknown)=>{saved=data;return {error:authFail?{}:null}}},from(){let operation='select';const filters:Record<string,unknown>={};const chain={select:()=>chain,order:()=>chain,eq:(k:string,v:unknown)=>{filters[k]=v;return chain},insert:(value:Record<string,unknown>)=>{operation='insert';lastWrite=value;return chain},update:(value:Record<string,unknown>)=>{operation='update';lastWrite=value;return chain},delete:()=>{operation='delete';return chain},single:async()=>({data:conflict?null:lastWrite,error:conflict?{code:'23505'}:null}),maybeSingle:async()=>({data:row&&row.user_id===filters.user_id?operation==='select'?row:{...row,...lastWrite,version:2}:null,error:null})};return chain}}
const shared={'@/lib/auth/dal':auth,'@/lib/interviews/api':api,'@/lib/supabase/server':{createClient:async()=>db},'@/lib/interviews/stories':{validateStory,validStoryId}}
type Handler=(request:Request,context?:unknown)=>Promise<Response>
const intro=loadModule('src/app/api/interviews/introduction/route.ts',{...shared,'@/lib/interviews/introduction':{INTRO_STATUSES}}) as {POST:Handler}
const create=loadModule('src/app/api/interviews/stories/route.ts',shared) as {POST:Handler}
const edit=loadModule('src/app/api/interviews/stories/[storyId]/route.ts',shared) as {PATCH:Handler;DELETE:Handler}
const req=(data:unknown)=>new Request('https://example.test/api',{method:'POST',body:JSON.stringify(data)})
const draft={id:'10000000-0000-4000-8000-000000000001',title:'Test',theme:'Growth',context:'A challenge',actions:'I asked for help',reflection:'Start earlier'}
test('introduction preference authenticates, limits fields, and reports unavailable account persistence',async()=>{
 user=null;assert.equal((await intro.POST(req({status:'skipped'}))).status,401)
 user={id:'owner'};role='admin';assert.equal((await intro.POST(req({status:'started'}))).status,403)
 role='student';assert.equal((await intro.POST(req({status:'bad'}))).status,400)
 assert.equal((await intro.POST(req({status:'skipped',role:'admin'}))).status,200);assert.equal(JSON.stringify(saved),JSON.stringify({data:{interview_intro_v1:'skipped'}}))
 authFail=true;assert.equal((await intro.POST(req({status:'completed'}))).status,503);authFail=false
})
test('story API ignores forged ownership, retries creation safely, and rejects cross-account or stale edits',async()=>{
 user=null;assert.equal((await create.POST(req(draft))).status,401)
 user={id:'owner'};assert.equal((await create.POST(req({...draft,user_id:'other'}))).status,201);assert.equal(lastWrite!.user_id,'owner')
 row={...draft,user_id:'owner',version:1};conflict=true;assert.equal((await create.POST(req(draft))).status,200);assert.equal((await create.POST(req({...draft,title:'Changed'}))).status,409);conflict=false
 const ctx={params:Promise.resolve({storyId:draft.id})}
 user={id:'other'};assert.equal((await edit.PATCH(req({...draft,version:1}),ctx)).status,404);assert.equal((await edit.DELETE(req({version:1}),ctx)).status,404)
 user={id:'owner'};assert.equal((await edit.PATCH(req({...draft,version:5}),ctx)).status,409)
 assert.equal((await edit.PATCH(req({...draft,title:'Updated',version:1,user_id:'forged'}),ctx)).status,200);assert.equal(lastWrite!.user_id,undefined);assert.equal(lastWrite!.version,undefined)
})
