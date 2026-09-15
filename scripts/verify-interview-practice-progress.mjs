// Explicitly authorised beta checks only. Uses disposable accounts; sends no mail.
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { randomBytes, randomUUID } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
if (!process.argv.includes('--authorised-public-beta-test')) throw new Error('Operator authorisation required')
const app = process.argv.find(arg => arg.startsWith('https://'))
if (!app || !new URL(app).hostname.endsWith('.vercel.app')) throw new Error('Supply a verified beta deployment URL')
const project='ghxwyfiemvyhijpmrhgf',url=`https://${project}.supabase.co`,ids=[],checks=[]
let admin,publicKey,phase='configuration',failed=false
const pass=label=>{checks.push(label);console.log('PASS '+label)}
async function request(path,user,method='GET',body,origin=app){const response=await fetch(app+path,{method,headers:{Origin:origin,'Content-Type':'application/json',...(user?{Cookie:user.cookie}:{})},body:body===undefined?undefined:JSON.stringify(body),redirect:'manual',signal:AbortSignal.timeout(45000)});const text=await response.text();let data;try{data=JSON.parse(text)}catch{}return {status:response.status,text,data}}
async function fixture(){
 const email=`practice-progress-${randomUUID()}@example.invalid`,password=randomBytes(32).toString('base64url')+'!Aa9'
 const result=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:'Disposable practice progress test',interview_intro_v1:'skipped'}})
 assert.ok(!result.error&&result.data.user);const id=result.data.user.id;ids.push(id)
 const jar=new Map(),client=createServerClient(url,publicKey,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:items=>items.forEach(({name,value})=>jar.set(name,value))},auth:{autoRefreshToken:false}})
 assert.equal((await client.auth.signInWithPassword({email,password})).error,null)
 return {id,client,cookie:[...jar].map(([name,value])=>`${name}=${value}`).join('; ')}
}
try{
 const {stdout}=await promisify(execFile)('/Users/patrick/.npm/_npx/aa8e5c70f9d8d161/node_modules/.bin/supabase',['projects','api-keys','--project-ref',project,'--reveal','--output','json'],{timeout:60000,maxBuffer:1048576})
 const keys=JSON.parse(stdout);publicKey=keys.find(k=>k.type==='publishable')?.api_key;const secret=keys.find(k=>k.type==='secret')?.api_key;assert.ok(secret&&publicKey)
 admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}})
 phase='disposable fixtures';const a=await fixture(),b=await fixture(),activityId=randomUUID()
 const before=(await admin.from('profiles').select('role,mmi_credits').eq('id',a.id).single()).data
 phase='authenticated and idempotent rehearsal start'
 assert.equal((await request('/api/interviews/practice',null,'POST',{id:activityId,stationId:'panel-motivation'})).status,401)
 assert.equal((await request('/api/interviews/practice',a,'POST',{id:activityId,stationId:'panel-motivation'},'https://unrelated.example')).status,403)
 for(let i=0;i<2;i++)assert.equal((await request('/api/interviews/practice',a,'POST',{id:activityId,stationId:'panel-motivation',user_id:b.id,self_rating:5})).status,200)
 const initial=await admin.from('interview_practice_logs').select('*').eq('id',activityId).single();assert.equal(initial.data.user_id,a.id);assert.equal(initial.data.self_rating,null);assert.equal(initial.data.completed_at,null)
 phase='preparation-only refusal'
 assert.equal((await request(`/api/interviews/practice/${activityId}`,a,'PATCH',{action:'complete',durationSeconds:10})).status,400)
 assert.equal((await request(`/api/interviews/practice/${activityId}`,a,'PATCH',{action:'rate',rating:4})).status,400)
 // Advance only this synthetic fixture's start timestamp; never alter a real session.
 assert.equal((await admin.from('interview_practice_logs').update({started_at:new Date(Date.now()-50000).toISOString()}).eq('id',activityId).eq('user_id',a.id)).error,null)
 phase='completion retry and self-rating'
 assert.equal((await request(`/api/interviews/practice/${activityId}`,a,'PATCH',{action:'complete',durationSeconds:10})).status,200)
 const completed=(await admin.from('interview_practice_logs').select('completed_at').eq('id',activityId).single()).data.completed_at
 assert.equal((await request(`/api/interviews/practice/${activityId}`,a,'PATCH',{action:'complete',durationSeconds:20})).status,200)
 assert.equal((await admin.from('interview_practice_logs').select('completed_at').eq('id',activityId).single()).data.completed_at,completed)
 assert.equal((await request(`/api/interviews/practice/${activityId}`,a,'PATCH',{action:'rate',rating:6})).status,400)
 assert.equal((await request(`/api/interviews/practice/${activityId}`,a,'PATCH',{action:'rate',rating:4})).status,200)
 assert.equal((await request(`/api/interviews/practice/${activityId}`,b,'PATCH',{action:'rate',rating:1})).status,404)
 assert.equal((await request(`/api/interviews/practice/${activityId}`,a,'PATCH',{action:'rate',rating:null})).status,200)
 assert.equal((await request(`/api/interviews/practice/${activityId}`,a,'PATCH',{action:'rate',rating:4})).status,200)
 pass('Rehearsals require spoken-response time, save once and support validated self-ratings without changing dates')
 phase='database privacy'
 const other=await b.client.from('interview_practice_logs').select('id').eq('id',activityId);assert.equal(other.error,null);assert.equal(other.data.length,0)
 assert.ok((await a.client.from('interview_practice_logs').update({self_rating:1}).eq('id',activityId)).error)
 pass('Cross-account reading/rating and direct database writes are refused')
 phase='full mock recording activity'
 const recordingIds=Array.from({length:8},()=>randomUUID()),mockId=randomUUID(),marker='PRIVATE_TRANSCRIPT_NOT_DASHBOARD_DATA'
 assert.equal((await admin.from('interview_attempts').insert(recordingIds.map((id,index)=>({id,user_id:a.id,format:'mmi',station_id:'mmi-resource-choice',station_title:'Synthetic practice calendar response',duration_seconds:90,questions:[marker],recording_path:`${a.id}/${id}/synthetic.webm`,recording_mime_type:'audio/webm',media_kind:'audio',upload_status:'ready',transcript:marker,station_snapshot:{mock_session:{id:mockId,mode:'full',index,total:8}}})))).error,null)
 assert.equal((await admin.from('interview_practice_logs').select('id').eq('user_id',a.id)).data.length,9)
 assert.equal((await admin.from('interview_attempts').update({upload_status:'ready'}).in('id',recordingIds)).error,null)
 assert.equal((await admin.from('interview_practice_logs').select('id').eq('user_id',a.id)).data.length,9)
 assert.equal((await request(`/api/interviews/practice/${recordingIds[0]}`,a,'PATCH',{action:'rate',rating:2})).status,200)
 pass('A full mock logs each saved response once; repeated finalisation cannot duplicate it')
 phase='server-rendered dashboard and isolation'
 const own=await request('/interviews',a),otherPage=await request('/interviews',b)
 assert.equal(own.status,200);assert.ok(own.text.includes('Your practice calendar')&&own.text.includes('Weekly theme summary')&&!own.text.includes('Your practice history couldn’t load.'));assert.ok(own.text.includes(activityId));assert.ok(!own.text.includes(marker)&&!own.text.includes('/storage/v1/object/sign/'))
 assert.equal(otherPage.status,200);assert.ok(!otherPage.text.includes(activityId)&&!recordingIds.some(id=>otherPage.text.includes(id)))
 assert.equal((await request(`/interviews/mock-interviews/review?attempt=${recordingIds[0]}`,a)).status,200)
 const after=(await admin.from('profiles').select('role,mmi_credits').eq('id',a.id).single()).data;assert.deepEqual(after,before)
 pass('Dashboard and recording self-rating render privately; no transcript/media or credits are included in progress')
 phase='recording deletion semantics'
 assert.equal((await admin.from('interview_attempts').delete().eq('id',recordingIds[0]).eq('user_id',a.id)).error,null)
 assert.equal((await admin.from('interview_practice_logs').select('id').eq('id',recordingIds[0])).data.length,0)
 pass('Deleting a recording also removes its activity; normal expiry retains the recording row and history')
}catch(error){failed=true;console.error('FAIL at '+phase+(typeof error.actual==='number'?` (actual ${error.actual}, expected ${error.expected})`:'')+'; credentials and service responses omitted')}
finally{
 for(const id of ids)if((await admin.auth.admin.deleteUser(id)).error){failed=true;console.error('Fixture cleanup required: '+id)}
 if(ids.length){const remaining=await admin.from('interview_practice_logs').select('id').in('user_id',ids);if(remaining.error||remaining.data.length){failed=true;console.error('Practice fixture cleanup verification failed')}else pass('All disposable accounts and practice history removed')}
 writeFileSync('.vercel/practice-progress-hosted-checks.json',JSON.stringify({app,passed:!failed,checks,fixtureIds:ids},null,2)+'\n')
}
if(failed)process.exitCode=1
