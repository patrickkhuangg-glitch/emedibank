import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {PGlite} from '@electric-sql/pglite'
import {INTRO_STEPS,hasSeenIntroduction,introductionAllowed,readIntroductionStep} from '../src/lib/interviews/introduction'
import {validateStory} from '../src/lib/interviews/stories'
const draft={title:'A team lesson',theme:'Teamwork',context:'We disagreed on the next step.',actions:'I asked each person to explain their concern.',reflection:'Listening first made the decision clearer.'}
test('introduction starts at dashboard, follows the workflow, and never opens timed or recording sessions',()=>{
 assert.equal(INTRO_STEPS[0].path,'/interviews');assert.equal(INTRO_STEPS.length,7)
 assert.ok(INTRO_STEPS.every(s=>introductionAllowed(s.path)))
 for(const path of ['/interviews/practice/session','/interviews/mock-interviews/session','/account','/interviews/unknown'])assert.equal(introductionAllowed(path),false)
 for(const value of [undefined,null,false,{},'unknown'])assert.equal(hasSeenIntroduction(value),false)
 for(const value of ['started','skipped','completed'])assert.equal(hasSeenIntroduction(value),true)
 for(const value of [null,'invalid','{"version":1,"step":99}','{"version":2,"step":1}','{"version":1,"step":-1}'])assert.equal(readIntroductionStep(value),null)
 assert.equal(readIntroductionStep('{"version":1,"step":3}'),3)
})
test('story validation trims and limits input, rejects invalid themes and ignores owner/version payloads',()=>{
 const value=validateStory({...draft,title:'  A team lesson  ',user_id:'forged',version:99})
 assert.deepEqual(value,draft);assert.throws(()=>validateStory({...draft,reflection:''}));assert.throws(()=>validateStory({...draft,theme:'private-script'}));assert.throws(()=>validateStory({...draft,context:'x'.repeat(2001)}))
})
test('story RLS isolates accounts, protects metadata, guards concurrent updates and cascades deletion',async()=>{
 const db=new PGlite(),owner='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002',id='10000000-0000-4000-8000-000000000001'
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated,service_role;insert into auth.users values('${owner}'),('${other}');`)
  await db.exec(readFileSync('supabase/migrations/0040_interview_story_bank.sql','utf8'))
  const asUser=async(user:string)=>db.exec(`reset role;set role authenticated;set request.jwt.claim.sub='${user}';`)
  await asUser(owner)
  await db.query('insert into interview_stories(id,user_id,title,theme,context,actions,reflection) values($1,$2,$3,$4,$5,$6,$7)',[id,owner,...Object.values(draft)])
  await assert.rejects(db.query('insert into interview_stories(user_id,title,theme,context,actions,reflection) values($1,$2,$3,$4,$5,$6)',[other,...Object.values(draft)]))
  await assert.rejects(db.query(`update interview_stories set user_id='${other}' where id='${id}'`));await assert.rejects(db.query(`update interview_stories set version=999 where id='${id}'`))
  await asUser(other);assert.equal((await db.query('select * from interview_stories')).rows.length,0)
  assert.equal((await db.query(`update interview_stories set title='forged' where id='${id}' returning id`)).rows.length,0)
  assert.equal((await db.query(`delete from interview_stories where id='${id}' returning id`)).rows.length,0)
  await asUser(owner)
  const first=await db.query<{version:number}>(`update interview_stories set title='Revised' where id='${id}' and version=1 returning version`);assert.equal(first.rows[0].version,2)
  assert.equal((await db.query(`update interview_stories set title='Stale' where id='${id}' and version=1 returning id`)).rows.length,0)
  await db.exec('reset role;set role anon;');await assert.rejects(db.query('select * from interview_stories'))
  await db.exec(`reset role;delete from auth.users where id='${owner}';`);assert.equal((await db.query('select * from interview_stories')).rows.length,0)
 }finally{await db.close()}
})
