import {readFileSync} from 'node:fs'
import {sql} from './lib/interview-operator.mjs'

const migration='0063_panel_response_dispositions.sql'
const body=readFileSync(`supabase/migrations/${migration}`,'utf8').replace(/^\s*begin;\s*/i,'').replace(/\s*commit;\s*$/i,'')
const [state]=await sql(`select
 exists(select 1 from information_schema.columns where table_schema='public' and table_name='interview_attempts' and column_name='response_disposition') as column_present,
 to_regprocedure('public.classify_panel_response(uuid,uuid,uuid,text)') is not null as function_present`)
if(state.column_present!==state.function_present)throw Error('Partial response-disposition migration detected; inspect before retry')
if(state.column_present){console.log(JSON.stringify({migration,applied:false,alreadyPresent:true}));process.exit(0)}

const checks=`do $check$ begin
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='interview_attempts' and column_name='response_disposition') then raise exception 'Disposition column missing';end if;
 if to_regprocedure('public.classify_panel_response(uuid,uuid,uuid,text)') is null then raise exception 'Classification function missing';end if;
 if has_function_privilege('authenticated','public.classify_panel_response(uuid,uuid,uuid,text)','execute') then raise exception 'Classification permission too broad';end if;
end $check$;`
await sql(`begin;set local lock_timeout='5s';set local statement_timeout='45s';${body}\n${checks}\nrollback;`,false)
if(process.argv.includes('--apply'))await sql(`begin;set local lock_timeout='5s';set local statement_timeout='45s';${body}\n${checks}\ncommit;`,false)
console.log(JSON.stringify({migration,rollbackPassed:true,applied:process.argv.includes('--apply')}))
