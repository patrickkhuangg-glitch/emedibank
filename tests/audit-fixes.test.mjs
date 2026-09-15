import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { PGlite } from '@electric-sql/pglite'

function load(file, deps) {
  const moduleBox = { exports: {} }
  const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(code, { module: moduleBox, exports: moduleBox.exports, Date, console, require(id) {
    if (id === 'server-only') return {}
    assert(id in deps, `Unexpected dependency: ${id}`)
    return deps[id]
  } })
  return moduleBox.exports
}
function query(result) {
  const q = { select: () => q, eq: () => q, maybeSingle: async () => result, then: (a, b) => Promise.resolve(result).then(a, b) }
  return q
}

test('database permissions, credit transactions and recoverable essay submissions', async (t) => {
  const db = new PGlite()
  t.after(() => db.close())
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id uuid default gen_random_uuid(), bucket_id text, name text);
    alter table storage.objects enable row level security;
    create function storage.foldername(text) returns text[] language sql as $$ select string_to_array($1,'/') $$;
    grant usage on schema public, auth, storage to anon, authenticated, service_role;
    grant all on all tables in schema storage to authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;`)
  for (const name of ['0001_init','0002_entitlements','0003_stripe_customer','0008_lock_profile_role','0010_interface_mode','0012_essays','0013_essay_marking','0014_essay_planning_sitting','0015_subscription_marking_allowances','0020_restore_essay_autosave','0021_interview_recordings','0023_interview_transcripts','0025_signup_protection','0026_fix_phone_number_constraint','0033_interview_video_marking','0034_audit_fixes']) {
    await db.exec(readFileSync(`supabase/migrations/${name}.sql`, 'utf8'))
  }
  const student='00000000-0000-4000-8000-000000000001', other='00000000-0000-4000-8000-000000000002'
  const essay='10000000-0000-4000-8000-000000000001', essayB='10000000-0000-4000-8000-000000000002'
  await db.exec(`insert into auth.users(id) values('${student}'),('${other}');
    insert into subtests(id, exam_id, name, slug) values ('20000000-0000-4000-8000-000000000001', (select id from exams where slug='gamsat'), 'Writing','writing');
    insert into essay_prompts(id,subtest_id,theme) values('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Theme');
    insert into essay_responses(id,user_id,prompt_id,body) values
    ('${essay}','${student}','30000000-0000-4000-8000-000000000001','Essay A'),
    ('${essayB}','${student}','30000000-0000-4000-8000-000000000001','Essay B');`)
  async function asStudent(id=student) { await db.exec(`reset role; set role authenticated; set request.jwt.claim.sub='${id}';`) }
  async function scalar(sql) { return (await db.query(sql)).rows[0].result }
  await asStudent()
  assert.equal(await scalar('select spend_essay_credits(-100) result'), false)
  assert.equal(await scalar('select spend_essay_credits(0) result'), false)
  assert.equal(await scalar('select spend_essay_credits(null) result'), false)
  assert.equal(await scalar('select essay_credits result from profiles'), 40)
  await db.exec(`update profiles set full_name='Student',phone_number='+61412345678' where id='${student}'`)
  await assert.rejects(db.exec(`update profiles set role='admin' where id='${student}'`))
  await assert.rejects(db.exec(`update profiles set essay_credits=100 where id='${student}'`))
  await db.exec(`update profiles set phone_number='+61412345679' where id='${other}'`)
  await db.exec('reset role')
  assert.equal(await scalar(`select phone_number result from profiles where id='${other}'`), null)
  await asStudent(other)
  assert.equal(await scalar(`select request_essay_marking('${essay}') result`), 'not_found')
  assert.equal(await scalar(`select submit_essay_response('${essay}','Changed',1,null) result`), 'not_found')
  await asStudent()
  const marked = await Promise.all([scalar(`select request_essay_marking('${essay}') result`),scalar(`select request_essay_marking('${essay}') result`)])
  assert.deepEqual(marked, ['marked','already'])
  assert.equal(await scalar('select essay_credits result from profiles'), 38)
  await db.exec(`update essay_responses set body='Changed after marking' where id='${essay}'`)
  assert.equal(await scalar(`select body result from essay_responses where id='${essay}'`), 'Essay A')
  await assert.rejects(db.exec(`insert into essay_responses(user_id,prompt_id,body,marking_status) values('${student}','30000000-0000-4000-8000-000000000001','Forged','approved')`))
  // A queue write failure must roll back the credit debit and response state.
  await db.exec(`reset role; create function fail_queue() returns trigger language plpgsql as $$ begin raise exception 'queue unavailable'; end $$;
    create trigger fail_queue before insert on essay_markings for each row execute function fail_queue();`)
  await asStudent()
  await assert.rejects(scalar(`select request_essay_marking('${essayB}') result`))
  assert.equal(await scalar('select essay_credits result from profiles'), 38)
  assert.equal(await scalar(`select status result from essay_responses where id='${essayB}'`), 'draft')
  await db.exec('reset role; drop trigger fail_queue on essay_markings;')
  // Task A was already saved when Task B failed. Retrying both must succeed.
  await asStudent()
  assert.equal(await scalar(`select submit_essay_response('${essay}','Essay A',60,null) result`), 'submitted')
  assert.equal(await scalar(`select submit_essay_response('${essayB}','Essay B',60,null) result`), 'submitted')
  assert.equal(await scalar(`select submit_essay_response('${essayB}','Essay B',60,null) result`), 'submitted')
  assert.equal(await scalar(`select submit_essay_response('${essay}','Different essay',60,null) result`), 'conflict')
  await assert.rejects(scalar(`select reserve_account_trial('${student}') result`))
  await db.exec('reset role; set role service_role')
  const windows=await Promise.all([scalar(`select reserve_account_trial('${student}') result`),scalar(`select reserve_account_trial('${student}') result`)])
  assert.equal(String(windows[0]),String(windows[1]))
  await db.exec(`update account_trial_windows set ends_at=now()-interval '1 day' where user_id='${student}'`)
  assert(new Date(await scalar(`select reserve_account_trial('${student}') result`)).getTime() < Date.now())
  await db.exec(`insert into subscriptions(user_id,status) values('${other}','canceled')`)
  assert(new Date(await scalar(`select reserve_account_trial('${other}') result`)).getTime() <= Date.now())
  // The new transcript worker persists through its privileged, fenced RPC;
  // students can read their transcript but cannot write it or read someone else's.
  const attempt='40000000-0000-4000-8000-000000000001'
  await db.exec(`insert into interview_attempts(id,user_id,format,station_id,station_title,recording_path,recording_mime_type,transcription_status)
    values('${attempt}','${student}','mmi','station','Station','${student}/audio.webm','audio/webm','processing');
    insert into interview_processing_jobs(attempt_id,job_type) values('${attempt}','transcribe');`)
  const job=(await db.query("select * from claim_next_interview_job('audit-worker')")).rows[0]
  assert.equal(await scalar(`select complete_interview_job('${job.id}','audit-worker','{"text":"Saved transcript", "model":"test"}') result`),true)
  await asStudent()
  assert.equal(await scalar(`select transcript result from interview_attempts where id='${attempt}'`),'Saved transcript')
  await assert.rejects(db.exec(`update interview_attempts set transcript='Forged' where id='${attempt}'`))
  await asStudent(other)
  assert.equal((await db.query('select * from interview_attempts')).rows.length,0)
})

test('practice history never authorizes unpaid, unpublished or cross-exam questions', async () => {
  let entitled=false, published=true, examId='exam', loads=0, saved, inserts=0
  const db={from(table){
    if(table==='exams')return query({data:{id:'exam',name:'Exam',slug:'gamsat'}})
    if(table==='practice_sessions')return {...query({data:saved}),insert(row){inserts++;saved={id:'session',...row};return Promise.resolve({error:null})}}
    if(table==='question_options')return query({data:[{id:'answer',is_correct:true}]})
    throw Error(table)
  }}
  const deps={
    '@/lib/auth/dal':{requireUser:async()=>({id:'student'})},
    '@/lib/supabase/server':{createClient:async()=>db},
    '@/lib/supabase/admin':{createAdminClient:()=>db},
    '@/lib/access':{canAccessExam:async()=>entitled},
    '@/lib/access/questions':{loadMeta:async(id)=>{loads++;return {id,exam_id:examId,published,explanation_text:'Explanation',data:null}},buildSafeQuestion:async(m)=>({id:m.id})}
  }
  const {recordPracticeSessionAction:record}=load('src/lib/practice/session-actions.ts',deps)
  const {getPracticeSessionReview:review}=load('src/lib/practice/sessions.ts',deps)
  const input={examSlug:'gamsat',subtestId:null,tag:null,mode:'sets',total:1,correct:0,timeSpentSeconds:0,questionIds:['question'],responses:[]}
  await record(input);assert.equal(inserts,0)
  // Direct database insert is also untrusted.
  saved={id:'forged',user_id:'student',exam_id:'exam',question_ids:['question'],responses:[]}
  assert.equal(await review('student','forged'),null);assert.equal(loads,0)
  entitled=true;published=false
  await record(input);assert.equal(inserts,0)
  assert.equal((await review('student','forged')).items.length,0)
  published=true;examId='different-exam'
  await record(input);assert.equal(inserts,0)
  assert.equal((await review('student','forged')).items.length,0)
  examId='exam';await record(input);assert.equal(inserts,1)
  assert.equal((await review('student','session')).items[0].correctOptionId,'answer')
})

test('checkout uses a fixed deadline, rejects history, and fails closed on ledger errors', async () => {
  let history=[], failure=null, deadline=new Date(Date.now()+7*86400000).toISOString(), reservations=0
  const {getCheckoutTrialEnd}=load('src/lib/stripe/trial.ts',{
    './client':{getStripe:()=>({subscriptions:{list:async()=>({data:history})}})},
    '@/lib/supabase/admin':{createAdminClient:()=>({rpc:async()=>{reservations++;return {data:deadline,error:failure}}})}
  })
  assert.equal(await getCheckoutTrialEnd('student','customer'),await getCheckoutTrialEnd('student','customer'))
  history=[{id:'past-subscription'}]
  const before=reservations;assert.equal(await getCheckoutTrialEnd('student','customer'),null);assert.equal(reservations,before)
  history=[];deadline=new Date(Date.now()+86400000).toISOString()
  assert.equal(await getCheckoutTrialEnd('student','customer'),null)
  failure={message:'database unavailable'}
  await assert.rejects(getCheckoutTrialEnd('student','customer'))
})
