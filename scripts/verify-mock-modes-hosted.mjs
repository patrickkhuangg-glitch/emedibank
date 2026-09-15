// Explicit operator smoke check. Credentials and session cookies stay in memory.
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { randomUUID, randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { writeFileSync } from 'node:fs'
if(!process.argv.includes('--authorised-public-beta-test'))throw new Error('Operator authorisation required')
const app=process.argv.find(a=>a.startsWith('https://'))
if(!app||!new URL(app).hostname.endsWith('.vercel.app'))throw new Error('Expected Vercel beta deployment URL')
const project='ghxwyfiemvyhijpmrhgf',url=`https://${project}.supabase.co`,users=[],checks=[],run=randomUUID()
let admin,publicKey,phase='configuration',failed=false
function ok(value,label){if(!value)throw new Error(label)}
function pass(label){checks.push(label);console.log(`PASS ${label}`)}
async function http(path,user,body){const response=await fetch(app+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(user?{Cookie:user.cookie}:{})},body:body===undefined?undefined:JSON.stringify(body),redirect:'manual',signal:AbortSignal.timeout(45000)});const text=await response.text();let data;try{data=JSON.parse(text)}catch{}return {status:response.status,text,data}}
async function user(label){
 const password=randomBytes(24).toString('base64url')+'!Aa9',email=`mock-modes-${run}-${label}@example.invalid`
 const created=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:'Disposable mock modes test',hosted_test_run:run}})
 ok(!created.error&&created.data.user,'create fixture')
 const fixture={id:created.data.user.id};users.push(fixture)
 const update=await admin.from('profiles').update({role:'student'}).eq('id',fixture.id);ok(!update.error,'set student role')
 const jar=new Map(),client=createServerClient(url,publicKey,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:items=>items.forEach(x=>jar.set(x.name,x.value))},auth:{autoRefreshToken:false}})
 const login=await client.auth.signInWithPassword({email,password});ok(!login.error,'sign in fixture');fixture.cookie=[...jar].map(([k,v])=>`${k}=${v}`).join('; ');return fixture
}
try{
 const {stdout}=await promisify(execFile)('/Users/patrick/.npm/_npx/aa8e5c70f9d8d161/node_modules/.bin/supabase',['projects','api-keys','--project-ref',project,'--reveal','--output','json'],{timeout:60000,maxBuffer:1024*1024})
 const keys=JSON.parse(stdout),key=keys.find(k=>k.type==='secret')?.api_key;publicKey=keys.find(k=>k.type==='publishable')?.api_key;ok(key&&publicKey,'keys available')
 admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
 phase='temporary student accounts';const a=await user('a'),b=await user('b')
 phase='student lobby';const lobby=await http('/interviews/mock-interviews',a)
 ok(lobby.status===200&&lobby.text.includes('Full MMI'),'new lobby')
 ok(!lobby.text.includes('href="/bookings"'),'student Bookings removed')
 ok(lobby.text.includes('href="/study-plan"'),'Study Plan retained')
 ok(!lobby.text.includes('Sam tells you')&&!lobby.text.includes('How would you respond to Sam'),'no scenario preview')
 pass('Student lobby contains full mock choices and Study Plan, without Bookings or scenario wording')
 phase='camera setup';const setup=await http('/interviews/mock-interviews/session?format=panel&mode=individual&selection=panel-motivation%3A2',a)
 ok(setup.status===200&&setup.text.includes('Allow camera and microphone'),'camera setup')
 ok(!setup.text.includes('How has your understanding of medical practice'),'no prompt in setup');pass('Individual panel setup keeps its selected question hidden')
 phase='timed session API';ok((await http('/api/interviews/mock-session',null,{action:'start',selection:{format:'panel',mode:'full'}})).status===401,'anonymous denied')
 const mmi=await http('/api/interviews/mock-session',a,{action:'start',selection:{format:'mmi',mode:'full'}})
 ok(mmi.status===200&&mmi.data.view.total===8&&mmi.data.view.phase==='preparation'&&mmi.data.view.questions.length===0,'8 station reading')
 ok(mmi.data.view.endsAt-mmi.data.view.startedAt===4800000,'80 minute total')
 const current=await http('/api/interviews/mock-session',a,{token:mmi.data.token,index:7,now:Date.now()+4800000})
 ok(current.status===200&&current.data.view.index===0&&current.data.view.phase==='preparation','future reveal blocked')
 ok((await http('/api/interviews/mock-session',b,{token:mmi.data.token})).status===403,'other student denied')
 ok((await http('/api/interviews/attempts/initiate',a,{mockToken:mmi.data.token,mockIndex:7,videoType:'video/webm'})).status===409,'future upload denied')
 pass('Eight-station MMI starts timed reading; future prompts/uploads and cross-account tickets are rejected')
 const panel=await http('/api/interviews/mock-session',a,{action:'start',selection:{format:'panel',mode:'full'}})
 ok(panel.status===200&&panel.data.view.total===10&&panel.data.view.phase==='response','full panel starts')
 ok(panel.data.view.endsAt-panel.data.view.startedAt===1800000&&panel.data.view.questions.length===1,'30 minute panel')
 pass('Full panel starts with one timed question and ten response sections totalling 30 minutes')
 const individual=await http('/api/interviews/mock-session',a,{action:'start',selection:{format:'panel',mode:'individual',selectionId:'panel-motivation:2'}})
 ok(individual.status===200&&individual.data.view.preparation==='How has your understanding of medical practice shaped the way you are preparing for medicine?','selected question')
 pass('Individually selected panel question is revealed correctly once timed reading starts')
}catch{failed=true;console.error(`FAIL at ${phase}; no credentials or raw service response logged`)}
finally{
 for(const fixture of users){const result=await admin.auth.admin.deleteUser(fixture.id);if(result.error){failed=true;console.error(`Fixture cleanup required for ${fixture.id}`)}}
 if(admin&&users.length){const remaining=await admin.from('profiles').select('id').in('id',users.map(u=>u.id));if(remaining.error||remaining.data.length){failed=true;console.error('Fixture cleanup verification failed')}else pass('Temporary student accounts removed')}
 writeFileSync('.vercel/mock-modes-hosted-result.json',JSON.stringify({app,run,checks,passed:!failed,fixtureIds:users.map(u=>u.id)},null,2)+'\n')
}
if(failed)process.exitCode=1
