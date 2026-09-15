// Disposable synthetic accounts; no student data, emails, payments or AI requests.
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {createServerClient} from '@supabase/ssr';
import {clients,sql,q,APP,SUPABASE_URL} from './lib/interview-operator.mjs';
if(!process.argv.includes('--authorised-public-beta-test'))throw Error('Explicit beta test required');
const run=randomUUID(),users=[],checks=[],hashes=[];let failure,paidCheckoutAvailable=false;
const {admin,publicKey}=await clients();
const ok=(v,m)=>{if(!v)throw Error(m)},data=(r,m)=>{if(r.error)throw Error(`${m}: ${r.error.code??r.error.status??'service error'}`);return r.data};
const pass=m=>{checks.push(m);console.log('PASS '+m)};
async function account(label){
 const email=`trial-release-${run}-${label}@example.invalid`,password=randomBytes(32).toString('base64url')+'!Aa9',ticket=randomBytes(32).toString('hex');
 data(await admin.rpc('authorize_signup',{p_email:email,p_token_hash:createHash('sha256').update(ticket).digest('hex')}),'signup ticket');
 const user=data(await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{signup_authorization:ticket,hosted_test_run:run,full_name:'Synthetic trial release',interview_intro_v1:'skipped'}}),'create fixture').user;
 const u={id:user.id};users.push(u);const jar=new Map();u.client=createServerClient(SUPABASE_URL,publicKey,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:values=>values.forEach(v=>jar.set(v.name,v.value))},auth:{persistSession:false,autoRefreshToken:false}});
 data(await u.client.auth.signInWithPassword({email,password}),'fixture sign in');u.cookie=[...jar].map(([k,v])=>`${k}=${v}`).join('; ');return u;
}
async function http(path,u,method='GET',body){const r=await fetch(APP+path,{method,redirect:'manual',headers:{Origin:APP,'Content-Type':'application/json',...(u?{Cookie:u.cookie}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(60000)});const text=await r.text();let json;try{json=JSON.parse(text)}catch{}return {status:r.status,json,text}}
try{
 const a=await account('a'),b=await account('b');
 const before=data(await admin.rpc('interview_trial_access',{p_user:a.id}),'access');ok(before.kind==='eligible','New account trial eligible');
 const dashboard=await http('/interviews',a);ok(dashboard.status===200&&!dashboard.text.includes('station=mmi-exam-answer-group-chat'),'Trial dashboard avoids paid-only recommendations');
 const page=await http('/interviews/practice',a);ok(page.status===200&&page.text.includes('Subscribe now'),'Trial catalogue and immediate paid link load');
 ok(page.text.includes('aria-label="Studocyte Interviews — switch exam"'),'Interview student header');
 for(const slug of ['ucat','gamsat','isat']){const academic=await http('/account',{...a,cookie:a.cookie+'; eb_exam='+slug});ok(academic.status===200&&academic.text.includes('Studocyte '+slug.toUpperCase()),'Exam header '+slug);}
 pass('Studocyte exam headers render for Interviews, UCAT, GAMSAT and ISAT');
 const start={id:randomUUID(),stationId:'mmi-team-disagreement',questionIndex:0,recording:true};
 const starts=await Promise.all(Array.from({length:3},()=>http('/api/interviews/practice',a,'POST',start)));ok(starts.every(r=>r.status===200),'Concurrent practice starts');
 const balance=data(await admin.from('profiles').select('mmi_credits').eq('id',a.id).single(),'credit balance');ok(balance.mmi_credits===2,'Exactly two welcome credits');
 hashes.push(...data(await admin.from('interview_trial_claims').select('identity_hash').eq('user_id',a.id),'fixture hashes').map(r=>r.identity_hash));
 pass('Verified account begins a seven-day trial; concurrent starts grant exactly two credits');
 const denied=await http('/api/interviews/practice',a,'POST',{...start,id:randomUUID(),stationId:'panel-motivation',questionIndex:1});ok(denied.status===403,'Panel second question locked');
 const unpermitted=await http('/api/interviews/practice/recordings',a,'POST',{id:randomUUID(),format:'panel',stationId:'panel-motivation',questionIndex:1,audioType:'audio/webm'});ok(unpermitted.status===403,'Recording entry cannot bypass question restriction');
 const sessionId=randomUUID(),panel={action:'start',selection:{format:'panel',mode:'full'},startId:sessionId};const mock=await http('/api/interviews/mock-session',a,'POST',panel);
 ok(mock.status===200&&mock.json.view.total===10&&mock.json.view.questions.length===1&&mock.json.view.endsAt-mock.json.view.startedAt===1200000,'Ten-question 20-minute panel');
 const retry=await http('/api/interviews/mock-session',a,'POST',panel);ok(retry.status===200&&retry.json.view.startedAt===mock.json.view.startedAt,'Mock retry preserves clock');
 ok((await http('/api/interviews/mock-session',a,'POST',{...panel,startId:randomUUID()})).status===403,'Second full panel denied');
 const mmi=await http('/api/interviews/mock-session',a,'POST',{action:'start',selection:{format:'mmi',mode:'full'},startId:randomUUID()});ok(mmi.status===200&&mmi.json.view.total===2,'Two-station trial MMI');
 pass('Restricted questions enforced by APIs; trial mocks have correct length and retry-safe limits');
 const id=randomUUID(),init=await http('/api/interviews/practice/recordings',a,'POST',{id,format:'panel',stationId:'panel-motivation',questionIndex:0,audioType:'audio/webm'});ok(init.status===200,'Audio recording initiation');
 const bytes=Buffer.alloc(1024);bytes.write('Synthetic storage accounting fixture; not a student recording.');
 data(await a.client.storage.from('interview-recordings').upload(init.json.audioPath,bytes,{contentType:'audio/webm'}),'Owner storage upload');
 const usage=data(await admin.from('interview_trial_claims').select('uploaded_bytes').eq('user_id',a.id).single(),'uploaded accounting');ok(usage.uploaded_bytes>=bytes.length,'Hosted storage metadata accounted');
 ok((await b.client.storage.from('interview-recordings').download(init.json.audioPath)).error,'Other student storage denied');
 ok((await b.client.from('interview_trial_claims').select('*')).error,'Trial accounting private');
 const reservations=await Promise.all(Array.from({length:3},()=>admin.rpc('reserve_interview_trial_seconds',{p_user:a.id,p_attempt:id,p_seconds:120})));ok(reservations.every(r=>!r.error&&r.data),'Concurrent reservation succeeds');
 const minutes=data(await admin.from('interview_trial_claims').select('seconds_reserved').eq('user_id',a.id).single(),'minutes');ok(minutes.seconds_reserved===120,'Minutes reserved once');
 pass('Hosted owner upload works, metadata counts toward storage, cross-student access is denied, and retries reserve minutes once');
 data(await admin.from('interview_attempts').update({transcription_status:'ready',transcript:'Synthetic saved transcript for trial-expiry verification.'}).eq('id',id),'saved transcript fixture');
 data(await admin.from('interview_trial_claims').update({expires_at:new Date(Date.now()-1000).toISOString()}).eq('user_id',a.id),'expire fixture');
 ok((await http('/api/interviews/practice',a,'POST',{...start,id:randomUUID()})).status===403,'Expired trial blocks practice');
 const transcript=await http(`/api/interviews/attempts/${id}/transcript`,a);ok(transcript.status===200&&transcript.json.transcript.includes('Synthetic saved transcript'),'Transcript remains readable');
 ok((await http(`/api/interviews/attempts/${id}/transcript`,b)).status===404,'Other student transcript denied');
 const exam=data(await admin.from('exams').select('id').eq('slug','interviews').single(),'interview exam');
 data(await admin.from('entitlements').insert({user_id:a.id,exam_id:exam.id,source:'comp',interview_trial_only:false}),'synthetic full entitlement');
 ok(data(await admin.rpc('interview_trial_access',{p_user:a.id}),'full access').kind==='full','Full entitlement overrides expired trial');
 ok((await http('/api/interviews/practice',a,'POST',{...start,id:randomUUID(),stationId:'panel-motivation',questionIndex:1})).status===200,'Full access restores question variety');
 pass('Expiry keeps transcripts readable; full access immediately restores unrestricted practice');
 const pricing=await http('/pricing');ok(pricing.status===200&&pricing.text.includes('Try Interviews free'),'Free trial pricing present');paidCheckoutAvailable=pricing.text.includes('name="checkoutMode"')&&pricing.text.includes('value="paid"');
 ok((await http('/interview-trial')).status===200,'Trial terms public');
 ok((await http('/prototypes/interviews/practice')).status===404,'Hosted prototypes hidden');
 pass('Public free-trial pricing and allowances load; local prototypes are hidden');
 console.log(paidCheckoutAvailable?'Paid checkout buttons visible':'Paid checkout remains disabled by existing billing configuration');
}catch(e){failure=e.message;process.exitCode=1;console.log('FAIL '+failure)}finally{
 try{for(const u of users){const current=data(await admin.auth.admin.getUserById(u.id),'cleanup ownership').user;ok(current.user_metadata.hosted_test_run===run,'Fixture ownership mismatch');
 const objects=await sql(`select name from storage.objects where bucket_id='interview-recordings' and (storage.foldername(name))[1]=${q(u.id)}`);if(objects.length)data(await admin.storage.from('interview-recordings').remove(objects.map(o=>o.name)),'remove fixture uploads');
 hashes.push(...data(await admin.from('interview_trial_claims').select('identity_hash').eq('user_id',u.id),'cleanup hashes').map(r=>r.identity_hash));data(await admin.auth.admin.deleteUser(u.id),'remove fixture user');}
 if(hashes.length)data(await admin.from('interview_trial_claims').delete().in('identity_hash',hashes),'remove synthetic tombstones');
 pass('Disposable accounts, uploads and synthetic anti-abuse records removed');
 }catch(e){failure=(failure??'')+'; cleanup: '+e.message;process.exitCode=1}
 writeFileSync('artifacts/interview-free-trial/hosted-checks.json',JSON.stringify({at:new Date().toISOString(),run,checks,failure:failure??null,synthetic:true,providerCalls:0,realPayment:false,paidCheckoutAvailable},null,2)+'\n');
}
