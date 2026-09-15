// Operator-only test: disposable fixture accounts, no recordings or marking jobs.
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {randomUUID,randomBytes} from 'node:crypto'
import {writeFileSync} from 'node:fs'
import {createClient} from '@supabase/supabase-js'
import {createServerClient} from '@supabase/ssr'
if(!process.argv.includes('--authorised-public-beta-test'))throw new Error('Explicit operator authorisation required')
const app=process.argv.find(a=>a.startsWith('https://'))
if(!app||!new URL(app).hostname.endsWith('.vercel.app'))throw new Error('Expected beta deployment URL')
const project='ghxwyfiemvyhijpmrhgf',url=`https://${project}.supabase.co`,users=[],checks=[]
let admin,publicKey,phase='configuration',failed=false
function ok(value){if(!value)throw new Error('Check failed')}
function pass(label){checks.push(label);console.log(`PASS ${label}`)}
async function http(path,user,body){const r=await fetch(app+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(user?{Cookie:user.cookie}:{})},body:body===undefined?undefined:JSON.stringify(body),redirect:'manual',signal:AbortSignal.timeout(45000)});const text=await r.text();let data;try{data=JSON.parse(text)}catch{}return {status:r.status,text,data}}
async function fixture(format){
 const email=`full-mock-test-${randomUUID()}@example.invalid`,password=randomBytes(24).toString('base64url')+'!Aa9'
 const created=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:'Disposable whole-mock test'}});ok(!created.error)
 const user={id:created.data.user.id,sessionId:randomUUID(),total:format==='mmi'?8:10};users.push(user)
 ok(!(await admin.from('profiles').update({role:'student',mmi_credits:0}).eq('id',user.id)).error)
 const jar=new Map(),client=createServerClient(url,publicKey,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:items=>items.forEach(i=>jar.set(i.name,i.value))},auth:{autoRefreshToken:false}})
 ok(!(await client.auth.signInWithPassword({email,password})).error);user.cookie=[...jar].map(([k,v])=>`${k}=${v}`).join('; ')
 const rows=Array.from({length:user.total},(_,index)=>{const id=randomUUID();return {id,user_id:user.id,format,station_id:'fixture',station_title:'Disposable whole-mock fixture',recording_path:`${user.id}/${id}/response.webm`,recording_mime_type:'video/webm',media_kind:'video',upload_status:'ready',duration_seconds:5,station_snapshot:{mock_session:{id:user.sessionId,mode:'full',index,total:user.total}},questions:['Synthetic fixture question']}})
 ok(!(await admin.from('interview_attempts').insert(rows)).error)
 user.firstId=rows[0].id
 return user
}
try{
 const {stdout}=await promisify(execFile)('/Users/patrick/.npm/_npx/aa8e5c70f9d8d161/node_modules/.bin/supabase',['projects','api-keys','--project-ref',project,'--reveal','--output','json'],{timeout:60000,maxBuffer:1048576})
 const keys=JSON.parse(stdout);publicKey=keys.find(k=>k.type==='publishable')?.api_key;const key=keys.find(k=>k.type==='secret')?.api_key;ok(key&&publicKey)
 admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
 for(const format of ['mmi','panel']){
  phase=`${format} fixture`;const user=await fixture(format),path=`/api/interviews/mock-sessions/${user.sessionId}/marking`
  phase=`${format} summary`;const summary=await http(path,user);ok(summary.status===200&&summary.data.ready&&summary.data.total===user.total&&summary.data.remaining===user.total&&summary.data.cost===12)
  ok((await http(path,null)).status===401)
  phase=`${format} insufficient credits`;const insufficient=await http(path,user,{expectedCredits:12});ok(insufficient.status===409&&insufficient.data.error.includes('credits'))
  ok(!(await admin.from('profiles').update({mmi_credits:12}).eq('id',user.id)).error)
  phase=`${format} unavailable media`;const unavailable=await http(path,user,{expectedCredits:12});ok(unavailable.status===409&&unavailable.data.error.includes('unavailable'))
  const profile=await admin.from('profiles').select('mmi_credits').eq('id',user.id).single();ok(profile.data.mmi_credits===12)
  const attempts=await admin.from('interview_attempts').select('marking_status').eq('user_id',user.id);ok(attempts.data.every(a=>a.marking_status===null))
  phase=`${format} review page`;const page=await http('/interviews/mock-interviews/review',user);ok(page.status===200&&page.text.includes('Review &amp; submit')&&!page.text.includes('<video')&&!page.text.includes('Raw automated feedback is never released'))
  const detail=await http(`/interviews/mock-interviews/review?attempt=${user.firstId}`,user);ok(detail.status===200&&detail.text.includes('Entire mock marking')&&detail.text.includes('strengths, weaknesses and how to improve'))
  const oldQuote=await http(`/api/interviews/attempts/${user.firstId}/submit-marking`,user,{expectedCredits:format==='mmi'?1:2});ok(oldQuote.status===409&&oldQuote.data.error.includes('price'))
  pass(`${format}: full-mock quote, signed-in review controls, insufficient credits and missing-media refusal without charges`)
 }
 phase='cross-account boundary';ok((await http(`/api/interviews/mock-sessions/${users[0].sessionId}/marking`,users[1])).status===404);pass('Other accounts cannot access full-mock marking options')
}catch{failed=true;console.error(`FAIL at ${phase}; raw service responses and credentials omitted`)}
finally{
 for(const user of users){const deleted=await admin.auth.admin.deleteUser(user.id);if(deleted.error){failed=true;console.error(`Fixture cleanup required: ${user.id}`)}}
 if(admin&&users.length){const remaining=await admin.from('interview_attempts').select('id').in('user_id',users.map(u=>u.id));if(remaining.error||remaining.data.length){failed=true;console.error('Fixture cleanup verification failed')}else pass('All disposable fixture accounts and attempts removed')}
 writeFileSync('.vercel/full-marking-hosted-api.json',JSON.stringify({app,checks,passed:!failed,fixtureIds:users.map(u=>u.id)},null,2)+'\n')
}
if(failed)process.exitCode=1
