import {test} from 'node:test'
import assert from 'node:assert/strict'
import {fullDatabase} from './helpers/full-database.mjs'
import {mmiFixture} from './helpers/mmi-v2-fixture'
test('with the full migration history, v2 approval keeps admin authority, source report version, watch confirmation, media and stale-write protection',async()=>{
 const db=await fullDatabase(),student='00000000-0000-4000-8000-000000000001',admin='00000000-0000-4000-8000-000000000002',attempt='00000000-0000-4000-8000-000000000003'
 try{
  await db.exec(`insert into auth.users(id) values('${student}'),('${admin}');update profiles set mmi_credits=20 where id='${student}';update profiles set role='admin' where id='${admin}';
  insert into interview_attempts(id,user_id,format,station_id,station_title,recording_path,recording_mime_type,media_kind,upload_status,marking_status) values('${attempt}','${student}','mmi','reflection','Reflection','sample/response.webm','video/webm','video','ready','awaiting_review');
  insert into interview_markings(attempt_id,status) values('${attempt}','awaiting_review');`)
  for(const score of [null,1,2,3,4,5,6,7]){
   assert.equal((await db.query<{valid:boolean}>('select valid_mmi_feedback_v2($1::jsonb) as valid',[JSON.stringify(mmiFixture(score))])).rows[0].valid,true,`valid global score ${score} is accepted`)
  }
  const f=mmiFixture(null)
  const review=async(value:unknown,version=0,watched=true,actor=admin)=>(await db.query<{r:string}>('select review_interview_marking($1,$2,$3,\'approve\',$4::jsonb,\'private\',\'correction\',$5) r',[attempt,actor,version,JSON.stringify(value),watched])).rows[0].r
  await db.exec('set role anon;');await assert.rejects(review(f));await db.exec('reset role;set role authenticated;');await assert.rejects(review(f));await db.exec('reset role;set role service_role;')
  await assert.rejects(review(f,0,true,student))
  assert.equal(await review(f,0,false),'invalid_feedback');assert.equal(await review(f,1),'conflict');assert.equal(await review(f),'media_missing')
  await db.exec(`reset role;insert into storage.objects(bucket_id,name) values('interview-recordings','sample/response.webm');set role service_role;`)
  const half=mmiFixture();half.domains[0].score=4.5;assert.equal(await review(half),'invalid_feedback')
  assert.equal(await review({...f,practice_task:'Exercise'}),'invalid_feedback')
  const noScope={...f,reviewer_scope:null};assert.equal(await review(noScope),'invalid_feedback')
  assert.equal(await review({...f,global:{status:'scored',score:5,reason:'No scored domains.'}}),'invalid_feedback')
  assert.equal(await review(f),'released');assert.equal(await review(f),'already_released')
  await db.exec('reset role;')
  const saved=(await db.query<{approved_feedback:unknown;transcript:string|null}>('select approved_feedback,transcript from interview_attempts where id=$1',[attempt])).rows[0]
  assert.deepEqual(saved.approved_feedback,f);assert.equal(saved.transcript,null)
  // Replacing the approval function must keep old saved MMI and panel drafts releasable.
  const legacy={overall:{score:5.5,band:'Strong developing response',summary:'A clear answer.'},domains:[{key:'communication',label:'Communication',applicable:true,score:5.5,evidence:['Explains the issue.'],comment:'Keep the opening clear.'}],strengths:['Relevant example.'],priorities:['Explain the outcome.'],practice_task:'Rehearse a concise answer.',reviewer_note:'Reviewed and approved by an EMeducate reviewer.'}
  for(const [format,id] of [['mmi','00000000-0000-4000-8000-000000000004'],['panel','00000000-0000-4000-8000-000000000005']]){
   await db.query(`insert into interview_attempts(id,user_id,format,station_id,station_title,recording_path,recording_mime_type,media_kind,upload_status,marking_status) values($1,$2,$3,'legacy','Legacy',$4,'video/webm','video','ready','awaiting_review')`,[id,student,format,`sample/${id}.webm`])
   await db.query("insert into storage.objects(bucket_id,name) values('interview-recordings',$1)",[`sample/${id}.webm`])
   await db.query("insert into interview_markings(attempt_id,status) values($1,'awaiting_review')",[id])
   await db.exec('set role service_role;')
   const result=await db.query<{r:string}>("select review_interview_marking($1,$2,0,'approve',$3::jsonb,'','',true) r",[id,admin,JSON.stringify(legacy)])
   assert.equal(result.rows[0].r,'released')
   await db.exec('reset role;')
   assert.deepEqual((await db.query<{approved_feedback:unknown}>('select approved_feedback from interview_attempts where id=$1',[id])).rows[0].approved_feedback,legacy)
  }
  const balance=(await db.query<{mmi_credits:number}>('select mmi_credits from profiles where id=$1',[student])).rows[0].mmi_credits;assert.equal(balance,20)
 }finally{await db.close()}
})
