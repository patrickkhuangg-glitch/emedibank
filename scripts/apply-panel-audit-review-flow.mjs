import {readFileSync} from 'node:fs'
import {sql} from './lib/interview-operator.mjs'

const migration='0065_panel_audit_review_flow.sql'
const body=readFileSync(`supabase/migrations/${migration}`,'utf8').replace(/^\s*begin;\s*/i,'').replace(/\s*commit;\s*$/i,'')
const [state]=await sql(`select pg_get_functiondef('public.complete_panel_job(uuid,text,jsonb)'::regprocedure) like '%draft_feedback=coalesce%' as applied`)
if(state.applied){console.log(JSON.stringify({migration,applied:false,alreadyPresent:true}));process.exit(0)}
const checks=`do $check$ begin
 if pg_get_functiondef('public.complete_panel_job(uuid,text,jsonb)'::regprocedure) not like '%draft_feedback=coalesce%' then raise exception 'Tutor draft preservation missing';end if;
 if pg_get_functiondef('public.review_whole_panel(uuid,uuid,integer,text,jsonb,text,text,boolean,boolean,boolean,boolean)'::regprocedure) not like '%processing%needs_attention%awaiting_review%in_review%' then raise exception 'Early tutor review states missing';end if;
 if pg_get_functiondef('public.retry_panel_job(uuid,uuid,text)'::regprocedure) not like '%case%when p_stage=%assess%then null else draft_feedback%' then raise exception 'Audit retry draft preservation missing';end if;
 if has_function_privilege('authenticated','public.review_whole_panel(uuid,uuid,integer,text,jsonb,text,text,boolean,boolean,boolean,boolean)','execute') then raise exception 'Review permission too broad';end if;
end $check$;`
await sql(`begin;set local lock_timeout='5s';set local statement_timeout='45s';${body}\n${checks}\nrollback;`,false)
if(process.argv.includes('--apply'))await sql(`begin;set local lock_timeout='5s';set local statement_timeout='45s';${body}\n${checks}\ncommit;`,false)
console.log(JSON.stringify({migration,rollbackPassed:true,applied:process.argv.includes('--apply')}))
