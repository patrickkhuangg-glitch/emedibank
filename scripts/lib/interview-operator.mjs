import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFileSync} from 'node:fs';
import {createClient} from '@supabase/supabase-js';
export const project='ghxwyfiemvyhijpmrhgf',APP='https://studocyte.emeducate.com.au',SUPABASE_URL=`https://${project}.supabase.co`;
export const team='team_Kabhu4fxCgOnBYGDvQBa8iqm',vercelProject='prj_8V3gHxGJPlXmPx4JvwPZIUq4RGEp';
export const q=v=>"'"+String(v).replaceAll("'","''")+"'";
let managementToken;
export async function sql(query,readOnly=true){
 if(!managementToken)for(const account of ['access-token','supabase'])try{managementToken=(await promisify(execFile)('security',['find-generic-password','-s','Supabase CLI','-a',account,'-w'])).stdout.trim();if(managementToken)break}catch{}
 if(!managementToken)throw Error('Supabase sign-in unavailable');
 const r=await fetch(`https://api.supabase.com/v1/projects/${project}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${managementToken}`,'Content-Type':'application/json'},body:JSON.stringify({query,read_only:readOnly}),signal:AbortSignal.timeout(60000)});
 if(!r.ok){const body=await r.text();throw Error(`Database HTTP ${r.status}; SQLSTATE ${body.match(/ERROR:\s*([A-Z0-9]{5})/)?.[1]??'unknown'} (details withheld)`)}return r.json();
}
export async function clients(){
 const {stdout}=await promisify(execFile)('/Users/patrick/.npm/_npx/aa8e5c70f9d8d161/node_modules/.bin/supabase',['projects','api-keys','--project-ref',project,'--reveal','--output','json'],{maxBuffer:1024*1024,timeout:60000});
 const keys=JSON.parse(stdout),secret=keys.find(k=>k.type==='secret')?.api_key,publicKey=keys.find(k=>k.type==='publishable')?.api_key;
 if(!secret||!publicKey)throw Error('Project keys unavailable');
 return {admin:createClient(SUPABASE_URL,secret,{auth:{persistSession:false,autoRefreshToken:false}}),publicKey};
}
export async function vercel(path,options={}){
 const token=JSON.parse(readFileSync('/Users/patrick/Library/Application Support/com.vercel.cli/auth.json','utf8')).token;
 const r=await fetch('https://api.vercel.com'+path,{...options,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(30000)});
 if(!r.ok)throw Error(`Vercel HTTP ${r.status}`);return r.json();
}
