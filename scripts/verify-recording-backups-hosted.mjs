// Disposable hosted storage verification. Credentials arrive through a one-use
// loopback form, remain in memory, and are never logged or written to disk.
import http from 'node:http';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import * as nodeCrypto from 'node:crypto';import * as streams from 'node:stream';
import * as sdk from '@aws-sdk/client-s3';
import {writeFileSync} from 'node:fs';
import {clients,sql,q} from './lib/interview-operator.mjs';
import {loadModule} from '../tests/helpers/load-module.mjs';
import {restoreRecordingBackup} from './lib/recording-backup-restore.mjs';
const nonce=randomBytes(24).toString('hex'),run=randomUUID(),fixtures=[],checks=[];
let userId,origin,started=false,cleaned=false,failure;
function save(){writeFileSync('artifacts/ongoing-backups/hosted-verification.json',JSON.stringify({run,synthetic:true,checks,cleaned,failure,fixtures:fixtures.map(({id,kind})=>({id,kind}))},null,2)+'\n')}
function checked(value,message){if(!value)throw Error(message);checks.push(message);save();console.log('PASS '+message)}
function data(result){if(result.error)throw Error('Hosted operation failed ('+(result.error.code??result.error.status??'unknown')+')');return result.data}
async function verify(credentials){
 const {admin:db}=await clients();
 const bucket='studocyte-interview-backups';
 const s3=new sdk.S3Client({region:'auto',endpoint:'https://0622cefffd663bb6274b09b0b5700bfa.r2.cloudflarestorage.com',credentials,requestChecksumCalculation:'WHEN_REQUIRED',responseChecksumValidation:'WHEN_REQUIRED'});
 const worker=loadModule('src/lib/interviews/recording-backups.ts',{'node:crypto':nodeCrypto,'node:stream':streams,'@aws-sdk/client-s3':sdk,'@/lib/supabase/admin':{createAdminClient:()=>db}},{AbortSignal,fetch,process:{env:{INTERVIEW_BACKUP_R2_ACCOUNT_ID:'0622cefffd663bb6274b09b0b5700bfa',INTERVIEW_BACKUP_R2_BUCKET:bucket,INTERVIEW_BACKUP_R2_ACCESS_KEY_ID:credentials.accessKeyId,INTERVIEW_BACKUP_R2_SECRET_ACCESS_KEY:credentials.secretAccessKey}}});
 try{
  const token=randomBytes(32).toString('hex'),email=`backup-check-${run}@example.invalid`;
  data(await db.rpc('authorize_signup',{p_email:email,p_token_hash:createHash('sha256').update(token).digest('hex')}));
  userId=data(await db.auth.admin.createUser({email,password:randomBytes(32).toString('base64url')+'Aa9!',email_confirm:true,user_metadata:{signup_authorization:token,hosted_test_run:run,full_name:'Synthetic backup verification'}})).user.id;save();
  for(const kind of ['audio','video']){
   const id=randomUUID(),path=`${userId}/${id}/backup-test.webm`,bytes=Buffer.alloc(kind==='audio'?256*1024:8*1024*1024,kind==='audio'?65:86);
   const f={id,kind,path,bytes};fixtures.push(f);save();
   data(await db.from('interview_attempts').insert({id,user_id:userId,format:'mmi',station_id:'synthetic-backup',station_title:'Synthetic backup transport check',recording_path:path,recording_mime_type:kind+'/webm',media_kind:kind,upload_status:'ready',duration_seconds:60,transcript:'Synthetic transcript must remain.',transcription_status:'ready'}));
   data(await db.storage.from('interview-recordings').upload(path,bytes,{contentType:kind+'/webm'}));
  }
  data(await db.from('interview_backup_health').update({enabled:true,last_success_at:new Date().toISOString(),last_error:null}).eq('singleton',true));
  let ready=false;
  for(let n=0;n<6&&!ready;n++){
   const result=await worker.runRecordingBackups();if(result.failed)throw Error('Backup worker reported copy failures');
   const rows=data(await db.from('interview_recording_backups').select('status,attempt_id').in('attempt_id',fixtures.map(f=>f.id)));
   ready=rows.length===2&&rows.every(r=>r.status==='ready');
  }
  checked(ready,'Hosted worker copied audio and video fixtures to private R2');
  for(const f of fixtures){
   const opts={db,s3,bucket,attemptId:f.id};checked((await restoreRecordingBackup(opts)).verified,`${f.kind}: complete backup digest verified`);
   data(await db.storage.from('interview-recordings').remove([f.path]));
   checked((await restoreRecordingBackup({...opts,restore:true})).restored,`${f.kind}: missing source restored`);
   const blob=data(await db.storage.from('interview-recordings').download(f.path));checked(Buffer.from(await blob.arrayBuffer()).equals(f.bytes),`${f.kind}: restored bytes exactly match original`);
  }
  data(await db.from('interview_attempts').update({marking_status:'awaiting_review'}).eq('id',fixtures[1].id));
  await sql(`begin;set local session_replication_role='replica';update interview_attempts set recording_expires_at=now()-interval '1 hour' where user_id=${q(userId)};set local session_replication_role='origin';commit;`,false);
  await worker.runRecordingBackups();
  const after=data(await db.from('interview_recording_backups').select('attempt_id,status').in('attempt_id',fixtures.map(f=>f.id)));
  checked(after.find(x=>x.attempt_id===fixtures[0].id)?.status==='deleted','Expired ordinary backup deleted');
  checked(after.find(x=>x.attempt_id===fixtures[1].id)?.status==='ready','Expired pending-marking backup protected');
  data(await db.from('interview_attempts').update({marking_status:'released'}).eq('id',fixtures[1].id));
  await worker.runRecordingBackups();
  for(const f of fixtures){let absent=false;try{await s3.send(new sdk.HeadObjectCommand({Bucket:bucket,Key:`recordings/${f.id}`}))}catch(e){absent=e.$metadata?.httpStatusCode===404}checked(absent,`${f.kind}: expired backup physically absent`)}
  const attempts=data(await db.from('interview_attempts').select('transcript').in('id',fixtures.map(f=>f.id)));
  checked(attempts.every(a=>a.transcript==='Synthetic transcript must remain.'),'All transcripts preserved after backup deletion');
 }catch(error){failure=error.message;console.log('FAIL '+failure);process.exitCode=1}
 finally{
  try{
   if(userId){const user=data(await db.auth.admin.getUserById(userId)).user;if(user.user_metadata.hosted_test_run!==run)throw Error('Cleanup ownership mismatch');
    data(await db.storage.from('interview-recordings').remove(fixtures.map(f=>f.path)));
    for(const f of fixtures)await s3.send(new sdk.DeleteObjectCommand({Bucket:bucket,Key:`recordings/${f.id}`}));
    data(await db.auth.admin.deleteUser(userId));
    await worker.runRecordingBackups();
   }
   cleaned=true;
  }catch{failure=(failure??'')+'; fixture cleanup requires attention';process.exitCode=1}
  s3.destroy();save();console.log('Hosted verification finished; cleaned='+cleaned);
 }
}
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,origin);
 const headers={'Content-Type':'text/html','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; form-action 'self'; style-src 'unsafe-inline'; frame-ancestors 'none'"};
 if(url.searchParams.get('session')!==nonce||req.headers.host!==new URL(origin).host){res.writeHead(403,headers);return res.end('Forbidden')}
 if(req.method==='GET'){res.writeHead(200,headers);return res.end('<html><title>Private backup verification</title><body style="font:18px system-ui;max-width:600px;margin:60px auto"><h1>Run hosted backup verification</h1><p>This one-use local form passes the restricted connection key directly to the test process in memory. It does not save credentials.</p><form method="post"><label>Access key<input name="accessKeyId" type="password" autocomplete="off"></label><br><label>Secret key<input name="secretAccessKey" type="password" autocomplete="off"></label><br><button>Run verification</button></form></body></html>')}
 if(req.method!=='POST'||req.headers.origin!==origin||started){res.writeHead(403,headers);return res.end('Forbidden')}
 let body='';for await(const chunk of req){body+=chunk;if(body.length>4096){res.writeHead(413,headers);return res.end('Too large')}}
 const values=new URLSearchParams(body),accessKeyId=values.get('accessKeyId'),secretAccessKey=values.get('secretAccessKey');
 if(!/^[a-f0-9]{32}$/.test(accessKeyId??'')||!/^[a-f0-9]{64}$/.test(secretAccessKey??'')){res.writeHead(400,headers);return res.end('Invalid credential format')}
 started=true;res.writeHead(200,headers);res.end('Verification is running. Results will appear in Codex; this form is now closed.');server.close();
 await verify({accessKeyId,secretAccessKey});
});
server.listen(0,'127.0.0.1',()=>{origin=`http://127.0.0.1:${server.address().port}`;console.log('One-use verification form: '+origin+'/?session='+nonce)});
setTimeout(()=>{if(!started){server.close();console.log('Unused verification form expired')}},600000).unref();
