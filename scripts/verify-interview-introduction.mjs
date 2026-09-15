// Disposable-account hosted checks. Never print or persist admin keys or session tokens.
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {randomUUID,randomBytes} from 'node:crypto'
import {writeFileSync} from 'node:fs'
import {createClient} from '@supabase/supabase-js'
import {createServerClient} from '@supabase/ssr'
if(!process.argv.includes('--authorised-public-beta-test'))throw new Error('Operator authorisation required')
const app=process.argv.find(a=>a.startsWith('https://'))
if(!app||!new URL(app).hostname.endsWith('.vercel.app'))throw new Error('Expected verified beta deployment URL')
const project='ghxwyfiemvyhijpmrhgf',url=`https://${project}.supabase.co`,users=[],checks=[]
let admin,publicKey,phase='configuration',failed=false
function ok(value){if(!value)throw new Error('Check failed')}
function pass(label){checks.push(label);console.log('PASS '+label)}
async function request(path,user,method='GET',body){const r=await fetch(app+path,{method,headers:{'Content-Type':'application/json',...(user?{Cookie:user.cookie}:{})},body:body===undefined?undefined:JSON.stringify(body),redirect:'manual',signal:AbortSignal.timeout(45000)});const text=await r.text();let data;try{data=JSON.parse(text)}catch{}return {status:r.status,data,text}}
async function fixture(){
 const email=`interview-intro-${randomUUID()}@example.invalid`,password=randomBytes(24).toString('base64url')+'!Aa9'
 const result=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:'Disposable introduction test',unrelated_preference:'preserved'}});ok(!result.error)
 const user={id:result.data.user.id};users.push(user)
 ok(!(await admin.from('profiles').update({role:'student'}).eq('id',user.id)).error)
 const jar=new Map(),client=createServerClient(url,publicKey,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:items=>items.forEach(i=>jar.set(i.name,i.value))},auth:{autoRefreshToken:false}})
 ok(!(await client.auth.signInWithPassword({email,password})).error);user.cookie=[...jar].map(([k,v])=>`${k}=${v}`).join('; ')
 return user
}
try{
 const {stdout}=await promisify(execFile)('/Users/patrick/.npm/_npx/aa8e5c70f9d8d161/node_modules/.bin/supabase',['projects','api-keys','--project-ref',project,'--reveal','--output','json'],{timeout:60000,maxBuffer:1048576})
 const keys=JSON.parse(stdout);publicKey=keys.find(k=>k.type==='publishable')?.api_key;const key=keys.find(k=>k.type==='secret')?.api_key;ok(key&&publicKey)
 admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
 phase='fixture accounts';const a=await fixture(),b=await fixture()
 phase='introduction persistence';ok((await request('/api/interviews/introduction',null,'POST',{status:'skipped'})).status===401)
 ok((await request('/api/interviews/introduction',a,'POST',{status:'invalid'})).status===400)
 ok((await request('/api/interviews/introduction',a,'POST',{status:'skipped',role:'admin'})).status===200)
 const stored=await admin.auth.admin.getUserById(a.id);ok(stored.data.user.user_metadata.interview_intro_v1==='skipped'&&stored.data.user.user_metadata.unrelated_preference==='preserved')
 ok((await admin.from('profiles').select('role').eq('id',a.id).single()).data.role==='student')
 pass('Introduction preference persists per account and preserves unrelated metadata and role')
 phase='story create and retry';const id=randomUUID(),draft={id,title:'Synthetic team reflection',theme:'Teamwork',context:'A disposable test scenario.',actions:'Asked each person to describe their concern.',reflection:'Listen before proposing a plan.',user_id:b.id}
 ok((await request('/api/interviews/stories',null,'POST',draft)).status===401)
 const created=await request('/api/interviews/stories',a,'POST',draft);ok(created.status===201&&created.data.story.user_id===a.id&&created.data.story.version===1)
 ok((await request('/api/interviews/stories',a,'POST',draft)).status===200)
 ok((await request('/api/interviews/stories',a)).data.stories.length===1)
 phase='story isolation';ok((await request('/api/interviews/stories',b)).data.stories.length===0)
 ok((await request(`/api/interviews/stories/${id}`,b,'PATCH',{...draft,version:1})).status===404)
 ok((await request(`/api/interviews/stories/${id}`,b,'DELETE',{version:1})).status===404)
 pass('Stories are private; forged ownership and cross-account edits/deletes are refused')
 phase='story edits';const changed=await request(`/api/interviews/stories/${id}`,a,'PATCH',{...draft,title:'Revised synthetic reflection',version:1});ok(changed.status===200&&changed.data.story.version===2)
 ok((await request(`/api/interviews/stories/${id}`,a,'PATCH',{...draft,version:1})).status===409)
 ok((await request(`/api/interviews/stories/${id}`,a,'DELETE',{version:1})).status===409)
 ok((await request(`/api/interviews/stories/${id}`,a,'DELETE',{version:2})).status===200)
 ok((await request('/api/interviews/stories',a)).data.stories.length===0)
 pass('Story creation is retry-safe; versioned editing and confirmed deletion work')
 phase='signed-in pages';for(const path of ['/interviews','/interviews/practice','/interviews/stories','/interviews/mock-interviews','/interviews/mock-interviews/review'])ok((await request(path,a)).status===200)
 pass('All tour destinations render for a student account')
}catch{failed=true;console.error('FAIL at '+phase+'; service responses and credentials omitted')}
finally{
 for(const user of users){if((await admin.auth.admin.deleteUser(user.id)).error){failed=true;console.error('Fixture cleanup required: '+user.id)}}
 if(admin&&users.length){const r=await admin.from('interview_stories').select('id').in('user_id',users.map(u=>u.id));if(r.error||r.data.length){failed=true;console.error('Story cleanup verification failed')}else pass('All disposable accounts and stories removed')}
 writeFileSync('.vercel/introduction-hosted-checks.json',JSON.stringify({app,passed:!failed,checks,fixtureIds:users.map(u=>u.id)},null,2)+'\n')
}
if(failed)process.exitCode=1
