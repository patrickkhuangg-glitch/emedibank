import {clients,SUPABASE_URL,vercel,team} from './lib/interview-operator.mjs'
import {createServerClient} from '@supabase/ssr'
import {randomUUID,randomBytes,createHash} from 'node:crypto'
import {readFileSync,writeFileSync,unlinkSync} from 'node:fs'
const file='/tmp/studocyte-ucat-release-fixture.json',dir='artifacts/ucat-mock-review-release'
const {admin,publicKey}=await clients()
if(process.argv.includes('--cleanup')){
 const fixture=JSON.parse(readFileSync(file));const result=await admin.auth.admin.deleteUser(fixture.id);if(result.error)throw Error('Fixture cleanup failed');unlinkSync(file);console.log('Temporary test account and its attempt data removed');
}else{
 const password=randomBytes(24).toString('base64url')+'!Aa9',email=`ucat-release-${randomUUID()}@example.invalid`
 const ticket=randomBytes(32).toString('hex')
 const authorization=await admin.rpc('authorize_signup',{p_email:email,p_token_hash:createHash('sha256').update(ticket).digest('hex')});if(authorization.error)throw Error('Verification signup authorization failed')
 const r=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{signup_authorization:ticket,full_name:'Temporary UCAT release verification'}})
 if(r.error||!r.data.user)throw Error('Unable to create verification account')
 const fixture={id:r.data.user.id,cookies:[]};writeFileSync(file,JSON.stringify(fixture),{mode:0o600})
 const snapshot=JSON.parse(readFileSync(`${dir}/assignments-before.json`))
 const entitlement=await admin.from('entitlements').insert({user_id:fixture.id,exam_id:snapshot.exam.id,source:'comp',expires_at:new Date(Date.now()+3600000).toISOString()});if(entitlement.error)throw Error(entitlement.error.message)
 const jar=new Map();const client=createServerClient(SUPABASE_URL,publicKey,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:items=>items.forEach(x=>jar.set(x.name,x.value))},auth:{autoRefreshToken:false}})
 if((await client.auth.signInWithPassword({email,password})).error)throw Error('Verification sign-in failed')
 fixture.cookies=[...jar].map(([name,value])=>({name,value,domain:'studocyte.emeducate.com.au',path:'/',secure:true,sameSite:'Lax'}))
 fixture.qrSubtestId=snapshot.subtests.find(s=>s.slug==='quantitative-reasoning').id
 writeFileSync(file,JSON.stringify(fixture),{mode:0o600});console.log('Temporary entitled test account ready; credentials withheld')
}
