// Disposable live fixtures. No real students, emails, payments or AI calls.
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {createClient} from '@supabase/supabase-js';
import {createServerClient} from '@supabase/ssr';
import {clients,sql,q,APP,SUPABASE_URL} from './lib/interview-operator.mjs';
if(!process.argv.includes('--authorised-public-beta-test'))throw Error('Explicit authorisation required');
const run=randomUUID(),users=[],checks=[],scenarios=[],file=`artifacts/release-access-credits/hosted-${run}.json`;
let phase='setup',failure;const {admin,publicKey}=await clients();
const anon=createClient(SUPABASE_URL,publicKey,{auth:{persistSession:false}});
const receipt=()=>writeFileSync(file,JSON.stringify({run,phase,failure,users:users.map(u=>u.id),checks,scenarios,synthetic:true,providerCalls:0},null,2));
function ok(v,m){if(!v)throw Error(m)}
function data(r,m){if(r.error)throw Error(`${m}: ${r.error.code??r.error.status??'service error'}`);return r.data}
function pass(m){checks.push(m);receipt();console.log('PASS '+m)}
async function account(label,role='student'){
 const password=randomBytes(32).toString('base64url')+'!Aa9',email=`access-credit-${run}-${label}@example.invalid`,ticket=randomBytes(32).toString('hex');
 data(await admin.rpc('authorize_signup',{p_email:email,p_token_hash:createHash('sha256').update(ticket).digest('hex')}),'ticket');
 const created=data(await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{signup_authorization:ticket,hosted_test_run:run,full_name:'Synthetic access and credit check',interview_intro_v1:'skipped'}}),'create account').user;
 const u={id:created.id};users.push(u);receipt();data(await admin.from('profiles').update({role,mmi_credits:0}).eq('id',u.id),'fixture role');
 const jar=new Map();u.client=createServerClient(SUPABASE_URL,publicKey,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:vs=>vs.forEach(v=>jar.set(v.name,v.value))},auth:{persistSession:false,autoRefreshToken:false}});
 data(await u.client.auth.signInWithPassword({email,password}),'sign in');u.cookie=[...jar].map(([k,v])=>`${k}=${v}`).join('; ');return u;
}
async function http(path,u,method='GET',body){const r=await fetch(APP+path,{method,redirect:'manual',headers:{Origin:APP,'Content-Type':'application/json',...(u?{Cookie:u.cookie}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(60000)});const text=await r.text();let json;try{json=JSON.parse(text)}catch{}return {status:r.status,json,text}}
const balance=async u=>data(await admin.from('profiles').select('mmi_credits').eq('id',u.id).single(),'balance').mmi_credits;
const fund=async(u,n)=>data(await admin.from('profiles').update({mmi_credits:n}).eq('id',u.id),'fixture balance');
async function fixture(u,format,total=1){const session=randomUUID(),ids=[];
 for(let index=0;index<total;index++){
  const id=randomUUID(),path=`${u.id}/${id}/release-check.webm`;ids.push(id);
  data(await admin.from('interview_attempts').insert({id,user_id:u.id,format,station_id:'synthetic-release-check',station_title:'Synthetic permission and credit check',questions:['Synthetic question'],recording_path:path,recording_mime_type:'video/webm',media_kind:'video',upload_status:'ready',duration_seconds:1,transcription_status:'processing',station_snapshot:total===1?{}:{mock_session:{id:session,mode:'full',index,total}}}),'fixture attempt');
  data(await admin.storage.from('interview-recordings').upload(path,Buffer.from('Synthetic permission fixture; not playable interview media.'),{contentType:'video/webm'}),'fixture object');
 }
 return {ids,session,format,total};
}
// Call the actual charging functions with the student's database role and UID.
// Queue postponement is in the same transaction, so the real worker can never
// consume these intentionally synthetic media/transcript fixtures.
async function submit(u,f,cost){
 const ids=f.ids.map(q).join(',');const call=f.total===1?`select submit_interview_for_marking(${q(f.ids[0])},${cost}) result;`:f.format==='mmi'?`select submit_mock_interview_for_marking(${q(f.session)},${cost}) result;`:`select submit_whole_panel_for_marking(${q(f.session)},${q(u.id)},${cost}) result;`;
 const setRole=f.format==='panel'&&f.total>1?'set local role service_role;':`set local role authenticated;set local request.jwt.claim.sub=${q(u.id)};`;
 const result=await sql(`begin;set local lock_timeout='10s';set local statement_timeout='20s';update interview_attempts set marking_preflight_at=now() where id=any(array[${ids}]::uuid[]) and user_id=${q(u.id)};${setRole}${call}reset role;update interview_processing_jobs set available_at=now()+interval '1 day' where attempt_id=any(array[${ids}]::uuid[]);update interview_mock_processing_jobs set available_at=now()+interval '1 day' where marking_id in(select id from interview_mock_markings where user_id=${q(u.id)} and mock_session_id=${q(f.session)});commit;`,false);
 const row=result.find(r=>'result' in r);ok(row,'Submission result missing');return typeof row.result==='string'?{status:row.result}:row.result;
}
const route=f=>f.total===1?`/api/interviews/attempts/${f.ids[0]}/submit-marking`:`/api/interviews/mock-sessions/${f.session}/marking`;
async function refund(f,staff){if(f.format==='panel'&&f.total>1){const m=data(await admin.from('interview_mock_markings').select('id').eq('mock_session_id',f.session).single(),'panel marking');return data(await admin.rpc('refund_whole_panel',{p_id:m.id,p_actor_id:staff.id,p_reason:'Synthetic release check: ungradable fixture'}),'panel refund')}
 return Promise.all(f.ids.map(id=>admin.rpc('refund_interview_marking',{p_attempt_id:id,p_actor_id:staff.id,p_reason:'Synthetic release check: ungradable fixture'}).then(r=>data(r,'station refund'))));}
try{
 const a=await account('a'),b=await account('b'),staff=await account('staff','admin');
 const blocked=await admin.auth.admin.createUser({email:`unticketed-${run}@example.invalid`,password:randomBytes(24).toString('hex'),email_confirm:true});
 if(blocked.data?.user){users.push({id:blocked.data.user.id});await admin.auth.admin.updateUserById(blocked.data.user.id,{user_metadata:{hosted_test_run:run}})}
 ok(blocked.error,'Unticketed email signup must be rejected');pass('Ticket-authorised accounts can sign in; direct unticketed email creation is rejected');
 phase='stories';const story={id:randomUUID(),title:'Private synthetic story',theme:'Growth',context:'Private test context',actions:'Private test action',reflection:'Private test reflection'};
 const saved=await http('/api/interviews/stories',a,'POST',story);ok(saved.status===201,'Owner story creation');
 ok((await http('/api/interviews/stories',a)).json.stories.some(s=>s.id===story.id),'Owner sees own story');
 ok(!(await http('/api/interviews/stories',b)).json.stories.some(s=>s.id===story.id),'Other student story list isolated');
 ok((await http('/api/interviews/stories',null)).status===401,'Anonymous stories denied');
 for(const method of ['PATCH','DELETE'])ok((await http(`/api/interviews/stories/${story.id}`,b,method,{...story,version:1})).status===404,'Cross-owner story change denied');
 const raw=await b.client.from('interview_stories').select('*').eq('id',story.id);ok(!raw.error&&raw.data.length===0,'Direct story read isolated');
 ok((await b.client.from('interview_stories').insert({...story,id:randomUUID(),user_id:a.id})).error,'Cross-owner story insert denied');
 ok((await b.client.from('interview_stories').update({reflection:'Forbidden'}).eq('id',story.id).select('id')).data?.length===0,'Cross-owner story update denied');
 const edited=await http(`/api/interviews/stories/${story.id}`,a,'PATCH',{...story,reflection:'Owner update',version:1});ok(edited.status===200&&edited.json.story.version===2,'Owner can edit story');pass('Stories: owner create/read/edit works; anonymous and cross-student reads/writes/deletes denied');
 phase='recordings';const privacy=await fixture(a,'mmi');const id=privacy.ids[0],object=`${a.id}/${id}/release-check.webm`;
 for(const suffix of ['media','transcript']){ok((await http(`/api/interviews/attempts/${id}/${suffix}`,b)).status===404,'Cross-owner '+suffix+' denied');ok((await http(`/api/interviews/attempts/${id}/${suffix}`,null)).status===401,'Anonymous '+suffix+' denied')}
 ok((await http(`/api/interviews/attempts/${id}`,b,'DELETE')).status===404,'Cross-owner deletion denied');
 ok((await http(route(privacy),b,'POST',{expectedCredits:2})).status===404,'Cross-owner marking denied');
 const ownMedia=await http(`/api/interviews/attempts/${id}/media`,a);ok(ownMedia.status===200&&ownMedia.json.url,'Owner playback URL available');
 ok((await b.client.storage.from('interview-recordings').createSignedUrl(object,60)).error,'Other student cannot sign media');
 ok((await anon.storage.from('interview-recordings').download(object)).error,'Anonymous storage download denied');
 const rows=await b.client.from('interview_attempts').select('*').eq('id',id);ok(!rows.error&&rows.data.length===0,'Raw attempt rows isolated');
 ok((await a.client.from('profiles').update({mmi_credits:10000}).eq('id',a.id)).error,'Student cannot grant own credits');
 ok((await a.client.from('profiles').update({role:'admin'}).eq('id',a.id)).error,'Student cannot become admin');
 for(const table of ['interview_markings','interview_mock_markings','interview_processing_jobs','interview_mock_processing_jobs','admin_marking_credit_grants'])for(const client of [anon,a.client,b.client])ok((await client.from(table).select('*').limit(1)).error,table+' private');
 ok((await http('/api/admin/interviews/health',a)).status===403,'Student admin monitor denied');ok((await http('/api/admin/interviews/health',staff)).status===200,'Admin monitor remains available');pass('Recordings, transcripts, private marking tables and admin controls isolated; student privilege/credit escalation denied');
 phase='charges';
 for(const [format,total,cost] of [['mmi',1,2],['panel',1,1],['mmi',8,12],['panel',10,12]]){
  const f=await fixture(a,format,total);await fund(a,0);ok((await submit(a,f,cost)).status==='no_credits','Insufficient credits rejected');ok(await balance(a)===0,'Rejected balance unchanged');
  await fund(a,40);ok((await submit(a,f,cost+1)).status==='quote_changed','Incorrect price rejected');ok(await balance(a)===40,'Stale quote balance unchanged');
  const results=await Promise.all(Array.from({length:4},()=>submit(a,f,cost)));ok(results.filter(r=>r.status==='submitted').length===1&&results.filter(r=>r.status==='already_submitted').length===3,'Concurrent charge idempotent');ok(await balance(a)===40-cost,'Exact charge');
  const retries=await Promise.all(Array.from({length:4},()=>http(route(f),a,'POST',{expectedCredits:cost})));ok(retries.every(r=>r.status===200),'HTTP retries accepted');ok(await balance(a)===40-cost,'HTTP retry no double charge');
  const canary='PRIVATE_DRAFT_'+run;const privatePayload={summary:canary};
  if(total===10)data(await admin.from('interview_mock_markings').update({assessment:privatePayload,evidence_audit:privatePayload,draft_feedback:privatePayload}).eq('mock_session_id',f.session),'private panel draft');
  else data(await admin.from('interview_markings').update({ai_assessment:privatePayload,evidence_audit:privatePayload,draft_feedback:privatePayload}).in('attempt_id',f.ids),'private station draft');
  const pendingRows=data(await a.client.from('interview_attempts').select('approved_feedback').in('id',f.ids),'owner feedback fields');ok(pendingRows.every(r=>r.approved_feedback===null),'Unreleased station feedback empty');
  const page=await http('/interviews/mock-interviews/review',a);ok(page.status===200,'Student review page loads');ok(!page.text.includes(canary),'Private draft absent from student HTML and serialized data');
  const denied=await a.client.rpc('refund_interview_marking',{p_attempt_id:f.ids[0],p_actor_id:staff.id,p_reason:'Denied spoofed actor'});ok(denied.error,'Student refund RPC denied');
  if(total===10){const mine=data(await a.client.rpc('get_my_panel_report',{p_session_id:f.session}),'own panel report');ok(mine?.feedback===null&&!JSON.stringify(mine).includes(canary),'Unreleased panel feedback hidden; own progress status visible');const other=data(await b.client.rpc('get_my_panel_report',{p_session_id:f.session}),'other panel report');ok(other===null,'Other student panel report hidden');const m=data(await admin.from('interview_mock_markings').select('id').eq('mock_session_id',f.session).single(),'panel');ok((await a.client.rpc('refund_whole_panel',{p_id:m.id,p_actor_id:staff.id,p_reason:'Denied'})).error,'Student whole-panel refund denied')}
  const refunded=await Promise.all(Array.from({length:4},()=>refund(f,staff)));ok(refunded.flat().every(x=>['refunded','already_refunded'].includes(x)),'Refund responses idempotent');ok(await balance(a)===40,'Refund restores exact credits once');
  const events=total===10?data(await admin.from('interview_mock_markings').select('credits_spent,refunded_at,status').eq('mock_session_id',f.session),'panel refunded'):data(await admin.from('interview_attempts').select('credits_spent,reviewed_at,marking_status').in('id',f.ids),'station refunded');
  ok(events.every(e=>e.credits_spent===0&&(total===10?e.status:e.marking_status)==='ungradable'),'Refund clears charged credits and marks ungradable');
  scenarios.push({format,total,cost,concurrentSubmissions:4,httpRetries:4,concurrentRefunds:4,balanceRestored:true});pass(`${format} ${total===1?'individual':total+'-response full mock'}: ${cost} credits; concurrent submissions/retries charge once; refunds restore once`);
 }
 phase='complete';pass('Live permissions and four pricing/refund scenarios passed');
}catch(e){failure=e.message;phase='failed';process.exitCode=1;console.log('FAIL '+phase+': '+failure);receipt()}
finally{
 try{for(const u of users){const current=data(await admin.auth.admin.getUserById(u.id),'verify cleanup owner').user;ok(current.user_metadata.hosted_test_run===run,'Cleanup owner mismatch');const objects=await sql(`select name from storage.objects where bucket_id='interview-recordings' and (storage.foldername(name))[1]=${q(u.id)}`);if(objects.length)data(await admin.storage.from('interview-recordings').remove(objects.map(o=>o.name)),'remove fixture objects');data(await admin.auth.admin.deleteUser(u.id),'delete test account')}
 const [left]=await sql(`select (select count(*) from auth.users where raw_user_meta_data->>'hosted_test_run'=${q(run)}) accounts,(select count(*) from interview_attempts where user_id=any(array[${users.map(u=>q(u.id)).join(',')}]::uuid[])) attempts,(select count(*) from storage.objects where bucket_id='interview-recordings' and (storage.foldername(name))[1]=any(array[${users.map(u=>q(u.id)).join(',')}]::text[])) objects`);ok(Object.values(left).every(v=>Number(v)===0),'Fixture cleanup incomplete');phase=failure?'failed-cleaned':'complete-cleaned';console.log('All disposable accounts, attempts and objects removed.');
 }catch(e){phase='cleanup-needs-attention';failure=(failure??'')+'; '+e.message;process.exitCode=1}receipt();console.log('Receipt: '+file)
}
