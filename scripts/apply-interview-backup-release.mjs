import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {sql} from './lib/interview-operator.mjs';
const names=['0057_interview_review_turnaround.sql','0058_interview_recording_backups.sql'];
const migrations=names.map(name=>({name,body:readFileSync(`supabase/migrations/${name}`,'utf8')}));
const [state]=await sql("select to_regclass('public.interview_backup_health') is not null present,to_regprocedure('public.interview_review_due_at(timestamptz)') is not null turnaround");
if(state.present||state.turnaround)throw Error('Release partly/already applied; inspect before retry');
const body=migrations.map(m=>m.body).join('\n');
const checks=`do $check$ begin
 if public.interview_review_due_at('2026-09-11T04:30:00Z')<>'2026-09-15T04:30:00Z'::timestamptz then raise exception 'Turnaround mismatch';end if;
 if public.claim_interview_backup(gen_random_uuid()) is not null then raise exception 'Backups must start disabled';end if;
 if has_table_privilege('authenticated','public.interview_recording_backups','select') or has_function_privilege('authenticated','public.claim_interview_backup(uuid)','execute') then raise exception 'Backup permissions too broad';end if;
 perform public.check_interview_operations();
 end $check$;`;
await sql(`begin;set local lock_timeout='5s';set local statement_timeout='30s';${body}\n${checks}\nrollback;`,false);
const receipt={at:new Date().toISOString(),rollbackPassed:true,applied:false,migrations:migrations.map(m=>({name:m.name,sha256:createHash('sha256').update(m.body).digest('hex')}))};
if(process.argv.includes('--apply')){await sql(`begin;set local lock_timeout='5s';set local statement_timeout='30s';${body}\n${checks}\ncommit;`,false);receipt.applied=true;}
writeFileSync('artifacts/ongoing-backups/migration.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({rollbackPassed:true,applied:receipt.applied,backupsEnabled:false}));
