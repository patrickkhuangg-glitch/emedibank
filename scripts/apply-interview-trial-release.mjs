import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { sql } from './lib/interview-operator.mjs';
const names=['0059_interview_free_trial.sql','0060_interview_trial_operations.sql'];
const migrations=names.map(name=>({name,body:readFileSync(`supabase/migrations/${name}`,'utf8')}));
const [state]=await sql("select to_regclass('public.interview_trial_settings') is not null present");
if(state.present)throw Error('Trial migration already present; inspect before retry');
const body=migrations.map(m=>m.body.replace(/^begin;\s*/i,'').replace(/commit;\s*$/i,'')).join('\n');
const checks=`do $check$ begin
 if (select enabled from public.interview_trial_settings where id) then raise exception 'Trial enabled too early';end if;
 if has_table_privilege('authenticated','public.interview_trial_claims','select') or has_function_privilege('authenticated','public.start_interview_trial(uuid,text)','execute') then raise exception 'Trial permissions too broad';end if;
 if to_regprocedure('public.defer_interview_trial_job(uuid,text,boolean)') is null then raise exception 'Deferral missing';end if;
end $check$;`;
await sql(`begin;set local lock_timeout='5s';set local statement_timeout='45s';${body}\n${checks}\nrollback;`,false);
const receipt={at:new Date().toISOString(),hostedRollbackPassed:true,applied:false,migrations:migrations.map(m=>({name:m.name,sha256:createHash('sha256').update(m.body).digest('hex')}))};
if(process.argv.includes('--apply')){await sql(`begin;set local lock_timeout='5s';set local statement_timeout='45s';${body}\n${checks}\ncommit;`,false);receipt.applied=true;}
writeFileSync('artifacts/interview-free-trial/migration.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
