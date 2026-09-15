import {test} from 'node:test'
import assert from 'node:assert/strict'
import Stripe from 'stripe'
import {loadModule} from './helpers/load-module.mjs'
import {fullDatabase} from './helpers/full-database.mjs'

test('checkout stays closed until environment separation, key mode and release approval agree',()=>{
 const {paymentsAvailable}=loadModule('src/lib/security/payments.ts')
 assert.equal(paymentsAvailable({}),false)
 const env={APP_ENV:'production',VERCEL_ENV:'production',PAYMENTS_ENABLED:'true',P0_RELEASE_APPROVED:'true',STRIPE_SECRET_KEY:'sk_live_fixture',NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:'pk_live_fixture',NEXT_PUBLIC_SUPABASE_URL:'https://prod.supabase.co',SUPABASE_EXPECTED_URL:'https://prod.supabase.co',PRODUCTION_SUPABASE_URL:'https://prod.supabase.co'}
 assert.equal(paymentsAvailable(env),true)
 for(const override of [{PAYMENTS_ENABLED:'false'},{P0_RELEASE_APPROVED:'false'},{APP_ENV:'staging'},{VERCEL_ENV:'preview'},{STRIPE_SECRET_KEY:'sk_test_fixture'},{SUPABASE_EXPECTED_URL:'https://staging.supabase.co'}])assert.equal(paymentsAvailable({...env,...override}),false)
 const staging={...env,APP_ENV:'staging',VERCEL_ENV:'preview',STRIPE_SECRET_KEY:'sk_test_fixture',NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:'pk_test_fixture',NEXT_PUBLIC_SUPABASE_URL:'https://staging.supabase.co',SUPABASE_EXPECTED_URL:'https://staging.supabase.co',P0_RELEASE_APPROVED:'false'}
 assert.equal(paymentsAvailable(staging),true)
 assert.equal(paymentsAvailable({...staging,NEXT_PUBLIC_SUPABASE_URL:env.PRODUCTION_SUPABASE_URL,SUPABASE_EXPECTED_URL:env.PRODUCTION_SUPABASE_URL}),false)
})

test('CSP blocks untrusted inline scripts/framing and canonical callbacks ignore hostile Host headers',async()=>{
 const {contentSecurityPolicy}=loadModule('src/lib/security/headers.ts')
 const csp=contentSecurityPolicy('fresh-test-nonce')
 assert(csp.includes("frame-ancestors 'none'"));assert(csp.includes("object-src 'none'"))
 const scripts=csp.split(';').find(d=>d.trim().startsWith('script-src'))
 assert(scripts.includes("'nonce-fresh-test-nonce'"));assert(!scripts.includes('unsafe-inline'));assert(!scripts.includes('unsafe-eval'))
 const {getOrigin}=loadModule('src/lib/site.ts',{}, {process:{env:{NEXT_PUBLIC_SITE_URL:'https://app.example.test'}}})
 assert.equal(await getOrigin(),'https://app.example.test')
 for(const value of [undefined,'https://user:pass@app.example.test','https://app.example.test/path','javascript:alert(1)']){
 const invalid=loadModule('src/lib/site.ts',{}, {process:{env:{NEXT_PUBLIC_SITE_URL:value}}})
 await assert.rejects(invalid.getOrigin())
 }
})

test('Stripe verifies signatures/mode, fetches current state for replay, and retries failed persistence',async()=>{
 const stripe=new Stripe('sk_test_fixture')
 const secret='test-signing-secret';let synced=0,retrieved=0,purchases=0,fail=false
 stripe.subscriptions.retrieve=async(id)=>{retrieved++;return {id,status:'canceled'}}
 const {POST}=loadModule('src/app/api/stripe/webhook/route.ts',{
 'next/server':{NextResponse:Response},'@/lib/stripe/client':{getStripe:()=>stripe},
 '@/lib/stripe/env':{getStripeWebhookSecret:()=>secret},
 '@/lib/stripe/sync-subscription':{upsertSubscriptionFromStripe:async(sub)=>{assert.equal(sub.status,'canceled');if(fail)throw Error('private database detail');synced++}},
 '@/lib/stripe/interview-purchase':{fulfilInterviewPurchase:async(session)=>{assert.equal(session.mode,'payment');purchases++}},
 },{process:{env:{APP_ENV:'staging'}}})
 const event={id:'evt_fixture',object:'event',livemode:false,type:'customer.subscription.updated',data:{object:{id:'sub_fixture',status:'active'}}}
 const request=(value=event,valid=true)=>{const payload=JSON.stringify(value);return new Request('https://app.test/webhook',{method:'POST',body:payload,headers:{'stripe-signature':valid?stripe.webhooks.generateTestHeaderString({payload,secret}):'invalid'}})}
 assert.equal((await POST(request(event,false))).status,400);assert.equal(synced,0)
 assert.equal((await POST(request({...event,livemode:true}))).status,400);assert.equal(retrieved,0)
 assert.equal((await POST(request())).status,200);assert.equal(synced,1)
 assert.equal((await POST(request())).status,200);assert.equal(retrieved,2)
 const purchase={...event,type:'checkout.session.completed',data:{object:{id:'cs_fixture',mode:'payment',payment_status:'paid'}}}
 assert.equal((await POST(request(purchase))).status,200);assert.equal(purchases,1)
 fail=true;const failed=await POST(request());assert.equal(failed.status,500);assert(!(await failed.text()).includes('private database'))
})

test('unsafe browser requests require the configured origin; signed server endpoints remain available',()=>{
 const {allowsRequestOrigin}=loadModule('src/lib/security/origin.ts')
 const request=(path,origin,method='POST')=>new Request(`https://app.test${path}`,{method,headers:origin?{origin}:{}})
 assert.equal(allowsRequestOrigin(request('/api/interviews/attempts/initiate','https://attacker.test'),'https://app.test'),false)
 assert.equal(allowsRequestOrigin(request('/api/interviews/attempts/initiate',null),'https://app.test'),false)
 assert.equal(allowsRequestOrigin(request('/api/interviews/attempts/initiate','https://app.test'),'https://app.test'),true)
 assert.equal(allowsRequestOrigin(request('/signup','null'),'https://app.test'),false)
 assert.equal(allowsRequestOrigin(request('/api/stripe/webhook',null),'https://app.test'),true)
 assert.equal(allowsRequestOrigin(request('/api/internal/interviews/process',null),'https://app.test'),true)
})

test('every migrated table and function has explicit access; private records cannot be read across accounts',async t=>{
 const db=await fullDatabase();t.after(()=>db.close())
 const a=crypto.randomUUID(),b=crypto.randomUUID(),admin=crypto.randomUUID()
 await db.query(`insert into auth.users(id,email,raw_app_meta_data) values($1,'a@example.test','{"provider":"google"}'),($2,'b@example.test','{"provider":"google"}'),($3,'admin@example.test','{"provider":"google"}')`,[a,b,admin])
 await db.query("update profiles set role='admin' where id=$1",[admin])
 const exam=(await db.query('select id from exams limit 1')).rows[0].id
 const sub=(await db.query('select id from subtests where exam_id=$1 limit 1',[exam])).rows[0].id
 const question=crypto.randomUUID(),prompt=crypto.randomUUID()
 await db.query("insert into questions(id,subtest_id,stem,explanation_text,published) values($1,$2,'Question','PRIVATE ANSWER',true)",[question,sub])
 await db.query("insert into essay_prompts(id,subtest_id,theme,published) values($1,$2,'Theme',true)",[prompt,sub])
 for(const id of [a,b]){
  await db.query("insert into subscriptions(user_id,status) values($1,'active')",[id])
  await db.query("insert into entitlements(user_id,exam_id,source) values($1,$2,'subscription')",[id,exam])
  await db.query("insert into practice_sessions(user_id,exam_id,total,correct) values($1,$2,1,1)",[id,exam])
  await db.query("insert into question_attempts(user_id,question_id,subtest_id,exam_id,is_correct) values($1,$2,$3,$4,true)",[id,question,sub,exam])
  await db.query("insert into essay_responses(user_id,prompt_id,body) values($1,$2,'Private essay')",[id,prompt])
  await db.query("insert into interview_study_notes(user_id,body) values($1,'Private note')",[id])
  await db.query("insert into study_plan_tasks(user_id,body) values($1,'Private task')",[id])
  await db.query("insert into study_plan_exam_dates(user_id,exam_id,exam_date) values($1,$2,current_date)",[id,exam])
  await db.query("insert into study_plans(user_id,name) values($1,'Private plan')",[id])
  await db.query("insert into google_calendar_connections(user_id,refresh_token) values($1,'synthetic-private-token')",[id])
 }
 const tables=(await db.query("select tablename from pg_tables where schemaname='public'")).rows.map(r=>r.tablename)
 const publicRead=new Set(['exams','subtests','products','essay_prompts'])
 const privateServer=new Set(['google_calendar_connections','signup_rate_limits','signup_authorizations','launch_waitlist','mock_question_assignments','mock_reports','mock_error_classifications','account_trial_windows','account_active_sessions','interview_trial_claims','interview_trial_settings','interview_trial_spend','interview_trial_uploads','interview_trial_usage','interview_markings','interview_processing_jobs','interview_marking_events','interview_resource_usage','interview_security_limits','interview_mock_markings','interview_mock_marking_members','interview_mock_processing_jobs','interview_mock_marking_events','interview_transcript_layouts','admin_marking_credit_grants','interview_worker_turns','interview_operation_runs','interview_operation_health','interview_operation_incidents','interview_upload_slots','interview_alert_deliveries','interview_recording_backups','interview_backup_health','interview_live_rooms','interview_live_participants','interview_live_feedback','interview_live_signals','interview_live_events','interview_live_join_attempts'])
 for(const table of tables){
  assert.equal((await db.query('select relrowsecurity from pg_class where oid=$1::regclass',[`public.${table}`])).rows[0].relrowsecurity,true,`${table} RLS`)
  for(const role of ['anon','authenticated']){
   const allowed=(await db.query("select has_table_privilege($1,$2,'SELECT') ok",[role,`public.${table}`])).rows[0].ok
   assert.equal(allowed,role==='anon'?publicRead.has(table):!privateServer.has(table),`${role} ${table}`)
   assert.equal((await db.query("select has_table_privilege($1,$2,'TRUNCATE') ok",[role,`public.${table}`])).rows[0].ok,false)
  }
 }
 const funcs=(await db.query("select p.oid::regprocedure::text signature,p.proname,p.prosecdef,p.proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'")).rows
 for(const f of funcs){
  if(f.prosecdef)assert(f.proconfig?.some(x=>x.startsWith('search_path=')),`${f.proname} pins search path`)
  for(const role of ['anon','authenticated']){
   const expected=f.proname==='is_admin'||(role==='authenticated'&&['spend_essay_credits','request_essay_marking','submit_essay_response','submit_interview_for_marking','submit_mock_interview_for_marking','get_my_panel_report','get_my_panel_report_index','record_interview_progression_action','claim_single_device_session','is_current_device_session'].includes(f.proname))
   assert.equal((await db.query("select has_function_privilege($1,$2,'EXECUTE') ok",[role,f.signature])).rows[0].ok,expected,`${role} ${f.signature}`)
  }
 }
 await db.exec(`set role authenticated;set request.jwt.claim.sub='${a}'`)
 const firstSession=crypto.randomUUID(),secondSession=crypto.randomUUID()
 await db.exec(`set request.jwt.claims='{"session_id":"${firstSession}"}'`)
 assert.equal((await db.query('select claim_single_device_session() ok')).rows[0].ok,true)
 await db.exec(`set request.jwt.claims='{"session_id":"${secondSession}"}'`)
 assert.equal((await db.query('select is_current_device_session() ok')).rows[0].ok,false)
 assert.equal((await db.query('select claim_single_device_session() ok')).rows[0].ok,true)
 await db.exec(`set request.jwt.claims='{"session_id":"${firstSession}"}'`)
 assert.equal((await db.query('select is_current_device_session() ok')).rows[0].ok,false)
 for(const table of ['subscriptions','entitlements','practice_sessions','question_attempts','essay_responses','interview_study_notes','study_plan_tasks','study_plan_exam_dates','study_plans']){
  const rows=(await db.query(`select user_id from ${table}`)).rows;assert.equal(rows.length,1,table);assert.equal(rows[0].user_id,a)
 }
 assert.equal((await db.query('select id from profiles')).rows.length,1)
 assert.equal((await db.query('select * from questions')).rows.length,0)
 await assert.rejects(db.query("update profiles set role='admin'"))
 await assert.rejects(db.query("insert into subscriptions(user_id,status) values($1,'active')",[a]))
 await assert.rejects(db.query("insert into study_plan_tasks(user_id,body) values($1,'Cross-user')",[b]))
 const updated=await db.query("update study_plan_tasks set body='Cross-user update' where user_id=$1 returning id",[b]);assert.equal(updated.rows.length,0)
 for(const table of privateServer)await assert.rejects(db.query(`select * from ${table}`))
 await db.exec('reset role;set role anon')
 for(const table of tables){if(publicRead.has(table))await db.query(`select * from ${table}`);else await assert.rejects(db.query(`select * from ${table}`))}
 await db.exec(`reset role;set role authenticated;set request.jwt.claim.sub='${admin}'`)
 assert.equal((await db.query('select * from questions')).rows.length,1)
 await db.exec('reset role')
 assert.equal((await db.query('select * from storage.buckets where public')).rows.length,0)
 assert.equal((await db.query('select * from pg_publication_tables')).rows.length,0)
 // Future tables and functions fail closed until a migration explicitly grants access.
 await db.exec('create table public.future_private(id integer); create function public.future_secret() returns int language sql as $$select 1$$')
 assert.equal((await db.query("select has_table_privilege('authenticated','future_private','SELECT') ok")).rows[0].ok,false)
 assert.equal((await db.query("select has_function_privilege('authenticated','future_secret()','EXECUTE') ok")).rows[0].ok,false)
})
