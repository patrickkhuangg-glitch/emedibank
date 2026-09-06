import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadModule } from './helpers/load-module.mjs'
import { INTERVIEW_STATIONS } from '../src/lib/interviews/stations'
import { getInterviewTiming } from '../src/lib/interviews/timing'
let user: {id:string}|null=null, unavailable=false
const rows=new Map<string,Record<string,unknown>>()
const db={from(){let operation='select',payload:Record<string,unknown>={},incomplete=false;const filters:Record<string,unknown>={}
 const result=()=>{
  if(unavailable)return {data:null,error:{}}
  if(operation==='upsert'){if(!rows.has(payload.id as string))rows.set(payload.id as string,{...payload,started_at:new Date().toISOString(),completed_at:null,self_rating:null,duration_seconds:0});return {data:null,error:null}}
  const row=rows.get(filters.id as string),owned=row&&row.user_id===filters.user_id
  if(operation==='update'&&owned&&(!incomplete||row.completed_at===null))Object.assign(row,payload)
  return {data:owned?row:null,error:null}
 }
 const chain={select:()=>chain,eq:(key:string,value:unknown)=>{filters[key]=value;return chain},is:()=>{incomplete=true;return chain},upsert:(value:Record<string,unknown>)=>{operation='upsert';payload=value;return chain},update:(value:Record<string,unknown>)=>{operation='update';payload=value;return chain},maybeSingle:async()=>result(),then:(resolve:(value:unknown)=>unknown)=>Promise.resolve(result()).then(resolve)}
 return chain
}}
const auth={getUser:async()=>user},admin={createAdminClient:()=>db}
const api=loadModule('src/lib/interviews/api.ts',{'@/lib/auth/dal':auth,'@/lib/supabase/admin':admin})
const shared={'@/lib/auth/dal':auth,'@/lib/supabase/admin':admin,'@/lib/interviews/api':api,'@/lib/interviews/stations':{INTERVIEW_STATIONS},'@/lib/interviews/timing':{getInterviewTiming}}
type Handler=(request:Request,context?:unknown)=>Promise<Response>
const start=loadModule('src/app/api/interviews/practice/route.ts',shared) as {POST:Handler},edit=loadModule('src/app/api/interviews/practice/[activityId]/route.ts',shared) as {PATCH:Handler}
const id='10000000-0000-4000-8000-000000000001',ctx={params:Promise.resolve({activityId:id})}
const req=(body:unknown,origin='https://practice.test')=>new Request('https://practice.test/api/interviews/practice',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)})
test('practice endpoints authenticate, reject forged ownership and refuse cross-origin writes',async()=>{
 user=null;assert.equal((await start.POST(req({id,stationId:'panel-motivation'}))).status,401)
 user={id:'owner'};assert.equal((await start.POST(req({id,stationId:'panel-motivation'},'https://foreign.test'))).status,403)
 assert.equal((await start.POST(req({id,stationId:'missing'}))).status,400)
 assert.equal((await start.POST(req({id,stationId:'panel-motivation',user_id:'victim',completed_at:'2020-01-01',self_rating:5}))).status,200)
 assert.equal(rows.get(id)!.user_id,'owner');assert.equal(rows.get(id)!.completed_at,null);assert.equal(rows.get(id)!.self_rating,null)
 const started=rows.get(id)!.started_at
 assert.equal((await start.POST(req({id,stationId:'panel-motivation'}))).status,200);assert.equal(rows.size,1);assert.equal(rows.get(id)!.started_at,started)
 user={id:'other'};assert.equal((await edit.PATCH(req({action:'rate',rating:5}),ctx)).status,404)
})
test('preparation alone cannot complete; completion retries do not change the date, and self-ratings validate and clear',async()=>{
 user={id:'owner'}
 assert.equal((await edit.PATCH(req({action:'rate',rating:5}),ctx)).status,400)
 assert.equal((await edit.PATCH(req({action:'complete',durationSeconds:10}),ctx)).status,400)
 rows.get(id)!.started_at=new Date(Date.now()-50000).toISOString()
 assert.equal((await edit.PATCH(req({action:'complete',durationSeconds:100}),ctx)).status,400)
 assert.equal((await edit.PATCH(req({action:'complete',durationSeconds:10,user_id:'other'}),ctx)).status,200)
 const completed=rows.get(id)!.completed_at
 assert.equal((await edit.PATCH(req({action:'complete',durationSeconds:20}),ctx)).status,200)
 assert.equal(rows.get(id)!.completed_at,completed);assert.equal(rows.get(id)!.duration_seconds,10)
 for(const rating of [0,6,2.5,'5',undefined])assert.equal((await edit.PATCH(req({action:'rate',rating}),ctx)).status,400)
 assert.equal((await edit.PATCH(req({action:'rate',rating:4}),ctx)).status,200);assert.equal(rows.get(id)!.self_rating,4)
 assert.equal((await edit.PATCH(req({action:'rate',rating:null}),ctx)).status,200);assert.equal(rows.get(id)!.self_rating,null)
 unavailable=true;assert.equal((await edit.PATCH(req({action:'rate',rating:4}),ctx)).status,503);unavailable=false
})
