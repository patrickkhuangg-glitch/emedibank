import {readFileSync} from 'node:fs'
import {sql} from './lib/interview-operator.mjs'

const migration='0064_mmi_response_dispositions.sql'
const body=readFileSync(`supabase/migrations/${migration}`,'utf8').replace(/^\s*begin;\s*/i,'').replace(/\s*commit;\s*$/i,'')
const [state]=await sql(`select
 to_regprocedure('public.classify_mmi_response(uuid,uuid,text)') is not null as classify_present,
 to_regprocedure('public.start_mmi_assessment(uuid,uuid)') is not null as start_present`)
if(state.classify_present!==state.start_present)throw Error('Partial MMI response-disposition migration detected; inspect before retry')
if(state.classify_present){console.log(JSON.stringify({migration,applied:false,alreadyPresent:true}));process.exit(0)}

const checks=`do $check$ begin
 if to_regprocedure('public.classify_mmi_response(uuid,uuid,text)') is null then raise exception 'MMI classification function missing';end if;
 if to_regprocedure('public.start_mmi_assessment(uuid,uuid)') is null then raise exception 'MMI assessment starter missing';end if;
 if has_function_privilege('authenticated','public.classify_mmi_response(uuid,uuid,text)','execute') then raise exception 'Classification permission too broad';end if;
 if has_function_privilege('authenticated','public.start_mmi_assessment(uuid,uuid)','execute') then raise exception 'Assessment permission too broad';end if;
end $check$;`
await sql(`begin;set local lock_timeout='5s';set local statement_timeout='45s';${body}\n${checks}\nrollback;`,false)
if(process.argv.includes('--apply'))await sql(`begin;set local lock_timeout='5s';set local statement_timeout='45s';${body}\n${checks}\ncommit;`,false)
console.log(JSON.stringify({migration,rollbackPassed:true,applied:process.argv.includes('--apply')}))
