// Exercises normal hosted cleanup using disposable fixtures only; no provider calls.
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {createServerClient} from '@supabase/ssr';
import {clients,sql,q,APP} from './lib/interview-operator.mjs';
if(!process.argv.includes('--authorised-live-retention-test'))throw Error('Explicit authorisation required');
const run=randomUUID(),checks=[],fixtures=[],file=`artifacts/release-retention-recovery/retention-${run}.json`;
const {admin,publicKey}=await clients();let userId,cookie,failure,cleaned=false;
function save(){writeFileSync(file,JSON.stringify({run,checks,fixtures:fixtures.map(f=>({id:f.id,kind:f.kind,state:f.state})),failure,cleaned,synthetic:true,providerCalls:0},null,2))}
function ok(v,m){if(!v)throw Error(m)}
function data(r,m){if(r.error)throw Error(m+': '+(r.error.code??r.error.status??'service error'));return r.data}
function pass(s){checks.push(s);save();console.log('PASS '+s)}
async function http(path){const r=await fetch(APP+path,{headers:{Cookie:cookie},signal:AbortSignal.timeout(30000)});return {status:r.status,body:await r.json()}}
async function rows(){return data(await admin.from('interview_attempts').select('id,video_deleted_at,transcript,marking_status,recording_expires_at').in('id',fixtures.map(f=>f.id)),'read fixtures')}
async function waitDeleted(ids){const until=Date.now()+7*60_000;while(Date.now()<until){const r=await rows();if(ids.every(id=>r.find(a=>a.id===id)?.video_deleted_at))return;console.log('Waiting for scheduled hosted retention worker ('+ids.length+' fixtures).');await new Promise(r=>setTimeout(r,20000))}throw Error('Hosted cleanup did not complete within seven minutes')}
try{
 const token=randomBytes(32).toString('hex'),email=`retention-${run}@example.invalid`,password=randomBytes(32).toString('base64url')+'!Aa9';
 data(await admin.rpc('authorize_signup',{p_email:email,p_token_hash:createHash('sha256').update(token).digest('hex')}),'signup ticket');
 userId=data(await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{signup_authorization:token,hosted_test_run:run,full_name:'Synthetic retention check'}}),'create fixture user').user.id;save();
 const jar=new Map();const client=createServerClient('https://ghxwyfiemvyhijpmrhgf.supabase.co',publicKey,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:vs=>vs.forEach(v=>jar.set(v.name,v.value))},auth:{persistSession:false,autoRefreshToken:false}});data(await client.auth.signInWithPassword({email,password}),'fixture sign in');cookie=[...jar].map(([k,v])=>k+'='+v).join('; ');
 for(const kind of ['audio','video'])for(const state of ['expired','fresh','queued','processing','awaiting_review','in_review','needs_attention']){
  const id=randomUUID(),path=`${userId}/${id}/response.webm`,transcript='Synthetic saved transcript '+id,bytes=Buffer.from('Private synthetic retention bytes '+id);
  data(await admin.from('interview_attempts').insert({id,user_id:userId,format:'mmi',station_id:'synthetic-retention',station_title:'Synthetic retention fixture',recording_path:path,recording_mime_type:kind+'/webm',media_kind:kind,upload_status:'ready',duration_seconds:60,transcript,transcription_status:'ready',marking_status:['expired','fresh'].includes(state)?null:state}),'create attempt');
  data(await admin.storage.from('interview-recordings').upload(path,bytes,{contentType:kind+'/webm'}),'upload fixture');fixtures.push({id,path,kind,state,transcript});save();
 }
 const expire=fixtures.filter(f=>f.state!=='fresh').map(f=>q(f.id)).join(',');
 // Connection-local trigger bypass changes only this disposable account's clocks.
 // It never disables a live trigger or changes another connection's behaviour.
 await sql(`begin;set local session_replication_role='replica';update public.interview_attempts set recording_expires_at=now()-interval '8 days' where user_id=${q(userId)} and id=any(array[${expire}]::uuid[]);set local session_replication_role='origin';commit;`,false);
 for(const f of fixtures){const media=await http(`/api/interviews/attempts/${f.id}/media?download=1`);ok(media.status===(f.state==='expired'?404:200),'Media access '+f.kind+' '+f.state);const transcript=await http(`/api/interviews/attempts/${f.id}/transcript`);ok(transcript.status===200&&transcript.body.transcript===f.transcript,'Transcript before cleanup');}
 pass('Expired audio/video cannot be downloaded; fresh and all five pending marking states remain accessible; transcripts readable.');
 await waitDeleted(fixtures.filter(f=>f.state==='expired').map(f=>f.id));
 for(const f of fixtures){const media=await admin.storage.from('interview-recordings').download(f.path);ok(f.state==='expired'?!!media.error:!media.error,'Storage bytes '+f.state);const t=await http(`/api/interviews/attempts/${f.id}/transcript`);ok(t.status===200&&t.body.transcript===f.transcript,'Retained transcript');}
 pass('Scheduled hosted cleanup physically removed expired audio/video bytes; fresh and pending recordings survived; transcripts remained accessible.');
 const pending=fixtures.filter(f=>!['expired','fresh'].includes(f.state));
 for(const f of pending)data(await admin.from('interview_attempts').update({marking_status:f.kind==='audio'?'released':'ungradable',reviewed_at:new Date().toISOString()}).eq('id',f.id).eq('user_id',userId),'finish synthetic review');
 await waitDeleted(pending.map(f=>f.id));
 for(const f of pending){ok((await admin.storage.from('interview-recordings').download(f.path)).error,'Reviewed old bytes deleted');const t=await http(`/api/interviews/attempts/${f.id}/transcript`);ok(t.status===200&&t.body.transcript===f.transcript,'Transcript after review cleanup');}
 for(const f of fixtures.filter(f=>f.state==='fresh'))ok(!(await admin.storage.from('interview-recordings').download(f.path)).error,'Fresh recording still present');
 pass('Once synthetic review finished (released/ungradable), overdue media was removed; all transcripts and unexpired recordings survived.');
}catch(e){failure=e.message;process.exitCode=1;console.log('FAIL '+failure)}
finally{try{if(userId){const u=data(await admin.auth.admin.getUserById(userId),'cleanup ownership').user;ok(u.user_metadata.hosted_test_run===run,'Cleanup ownership mismatch');const objects=await sql(`select name from storage.objects where bucket_id='interview-recordings' and (storage.foldername(name))[1]=${q(userId)}`);if(objects.length)data(await admin.storage.from('interview-recordings').remove(objects.map(x=>x.name)),'remove test objects');data(await admin.auth.admin.deleteUser(userId),'remove test user');const [remaining]=await sql(`select (select count(*) from auth.users where id=${q(userId)}) users,(select count(*) from public.interview_attempts where user_id=${q(userId)}) attempts,(select count(*) from storage.objects where bucket_id='interview-recordings' and (storage.foldername(name))[1]=${q(userId)}) objects`);ok(Object.values(remaining).every(v=>Number(v)===0),'Cleanup incomplete')}cleaned=true}catch(e){failure=(failure??'')+'; cleanup: '+e.message;process.exitCode=1}save();console.log('Receipt: '+file+'; cleaned='+cleaned)}
