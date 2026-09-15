// Provider and Vercel secrets stay in process memory. Receipts contain IDs only.
import {writeFileSync,existsSync} from 'node:fs';
import {vercel,team,vercelProject} from './lib/interview-operator.mjs';
if(!process.argv.includes('--authorised-rotation'))throw Error('Explicit key rotation authorisation required');
const receipt='artifacts/release-access-credits/resend-rotation.json';if(existsSync(receipt))throw Error('Rotation already started; inspect receipt before retrying');
const env=await vercel(`/v1/projects/${vercelProject}/env/fLige0dmTMnn3jd7?teamId=${team}`);
if(!env.value?.startsWith('re_'))throw Error('Existing key is unavailable');
async function api(path,options={}){const r=await fetch('https://api.resend.com'+path,{...options,headers:{Authorization:`Bearer ${env.value}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error(`Resend request failed (${r.status})`);return r.json()}
const domains=await api('/domains'),domain=domains.data.find(d=>d.name==='send.emeducate.com.au');if(!domain||domain.status!=='verified')throw Error('Sending domain is not verified');
const keys=await api('/api-keys'),old=keys.data.find(k=>k.id==='36339eb7-5ec6-4aa3-8e2d-3067019d9279'&&k.name==='INTERVIEW_ALERT_RESEND_API_KEY');if(!old)throw Error('Expected old key not found');
const created=await api('/api-keys',{method:'POST',body:JSON.stringify({name:'Studocyte operational alerts production 2026-09-08',permission:'sending_access',domain_id:domain.id})});
const record={at:new Date().toISOString(),oldKeyId:old.id,newKeyId:created.id,domain:domain.name,permission:'sending_access',environmentUpdated:false,oldRevoked:false};writeFileSync(receipt,JSON.stringify(record,null,2));
try{
 await vercel(`/v9/projects/${vercelProject}/env/${env.id}?teamId=${team}`,{method:'PATCH',body:JSON.stringify({value:created.token,type:'encrypted',target:['production']})});
 record.environmentUpdated=true;writeFileSync(receipt,JSON.stringify(record,null,2));
 console.log('New domain-restricted sending key stored in Vercel; deployment required before retiring the old key. No key value was saved locally.');
}catch{await api(`/api-keys/${created.id}`,{method:'DELETE'});throw Error('Environment update failed; replacement key revoked. Existing key remains active.')}
