import {execFileSync} from 'node:child_process';
let token;
export async function management(path,options={}) {
 if(!token)for(const account of ['access-token','supabase'])try{token=execFileSync('security',['find-generic-password','-s','Supabase CLI','-a',account,'-w'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();if(token)break}catch{}
 if(!token)throw Error('Supabase CLI sign-in unavailable');
 const r=await fetch('https://api.supabase.com/v1'+path,{...options,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(60000)});
 if(!r.ok){await r.arrayBuffer();throw Error('Management '+path.replace(/[a-z]{20}/g,'[project]')+' HTTP '+r.status)}
 const text=await r.text();return text?JSON.parse(text):null;
}
export async function queryProject(ref,query,readOnly=true){return management(`/projects/${ref}/database/query`,{method:'POST',body:JSON.stringify({query,read_only:readOnly})})}
export async function databaseEnvironment(ref,readOnly=true){
 const poolers=await management(`/projects/${ref}/config/database/pooler`);
 const p=poolers.find(p=>p.pool_mode==='session')??poolers.find(p=>p.database_type==='PRIMARY')??poolers[0];
 if(!p?.db_host)throw Error('Pooler connection unavailable');
 const login=await management(`/projects/${ref}/cli/login-role`,{method:'POST',body:JSON.stringify({read_only:readOnly})});
 if(!login.role||!login.password)throw Error('Temporary database login unavailable');
 return {env:{...process.env,PGHOST:p.db_host,PGPORT:String(p.pool_mode==='session'?p.db_port:5432),PGDATABASE:p.db_name??'postgres',PGUSER:login.role+'.'+ref,PGPASSWORD:login.password,PGSSLMODE:'require',PGCONNECT_TIMEOUT:'20'},ttlSeconds:login.ttl_seconds};
}
