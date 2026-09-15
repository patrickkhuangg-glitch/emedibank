import {test} from 'node:test'
import assert from 'node:assert/strict'
import {panelDispatchExists} from '../scripts/lib/interview-scheduler.mjs'
import {fullDatabase} from './helpers/full-database.mjs'
import {panelFixture,panelMembers,panelOwner as owner,panelAdmin as admin,panelSession as session} from './helpers/panel-fixture'
test('whole-panel database: one charge, ten transcripts, one assessment/audit, private draft and atomic owner-only release',async()=>{
 const db=await fullDatabase(),members=panelMembers(),a=panelFixture(members)
 const call=async<T=string>(sql:string,args:unknown[]=[]) => (await db.query<{r:T}>(`select ${sql} r`,args)).rows[0].r
 const submit=()=>call<{status:string;charged:number}>('submit_whole_panel_for_marking($1,$2,12)',[session,owner])
 const scalar=async(sql:string)=>(await db.query<{n:number}>(sql)).rows[0].n
 const role=async(name:string,id=owner)=>db.exec(`reset role;set role ${name};set request.jwt.claim.sub='${id}';`)
 try{
 await db.exec(`insert into auth.users(id) values('${owner}'),('${admin}');update profiles set mmi_credits=30 where id='${owner}';update profiles set role='admin' where id='${admin}';`)
 for(const m of members){await db.query(`insert into interview_attempts(id,user_id,format,station_id,station_title,recording_path,recording_mime_type,media_kind,upload_status,marking_preflight_at,station_snapshot,questions,duration_seconds) values($1,$2,'panel','test',$3,$4,'video/webm','video','ready',now(),$5::jsonb,$6::jsonb,120)`,[m.id,owner,m.station_title,`${owner}/${m.id}/response.webm`,JSON.stringify(m.station_snapshot),JSON.stringify(m.questions)]);await db.query("insert into storage.objects(bucket_id,name) values('interview-recordings',$1)",[`${owner}/${m.id}/response.webm`])}
 await role('anon');await assert.rejects(submit());await role('authenticated');await assert.rejects(submit());await role('service_role')
 assert.equal((await call<{status:string}>('submit_whole_panel_for_marking($1,$2,12)',[session,admin])).status,'not_ready')
 assert.equal((await call<{status:string}>('submit_whole_panel_for_marking($1,$2,11)',[session,owner])).status,'quote_changed')
 assert.equal((await submit()).status,'submitted');assert.equal((await submit()).status,'already_submitted')
 assert.equal(await scalar(`select mmi_credits n from profiles where id='${owner}'`),18)
 assert.equal(await scalar('select count(*)::int n from interview_markings'),0)
 assert.equal(await scalar('select count(*)::int n from interview_mock_processing_jobs'),0)
 const id=await call<string>(`(select id from interview_mock_markings where mock_session_id='${session}')`)
 assert.equal(await call('reserve_interview_deletion($1,$2)',[members[0].id,owner]),false)
 assert.equal(await call('refund_interview_marking($1,$2,\'bad\')',[members[0].id,admin]),'whole_panel_required')
 for(let i=0;i<10;i++){
 const j=(await db.query<{id:string;attempt_id:string}>("select * from claim_next_interview_job('worker')")).rows[0];assert.ok(j)
 const text=members.find(m=>m.id===j.attempt_id)!.transcript
 assert.equal(await call('complete_interview_job($1,\'stale\',$2::jsonb)',[j.id,JSON.stringify({text,model:'synthetic'})]),false)
 assert.equal(await call('complete_interview_job($1,\'worker\',$2::jsonb)',[j.id,JSON.stringify({text,model:'synthetic'})]),true)
 assert.equal(await call('complete_interview_job($1,\'worker\',$2::jsonb)',[j.id,JSON.stringify({text,model:'synthetic'})]),false)
 assert.equal(await scalar('select count(*)::int n from interview_mock_processing_jobs'),i===9?1:0)
 assert.equal(await scalar("select count(*)::int n from interview_processing_jobs where job_type in ('assess','audit')"),0)
 }
 assert.equal(await call('queue_ready_panel($1)',[id]),false)
 assert.equal(await scalar("select count(*)::int n from list_interview_review_queue('','','0')"),0)
 assert.equal((await call<{waiting:number}>('interview_assessment_counts()')).waiting,1)
 await role('authenticated');await assert.rejects(db.query('select * from interview_mock_markings'));await assert.rejects(db.query('select * from interview_mock_processing_jobs'));assert.equal((await call<{feedback:unknown}>('get_my_panel_report($1)',[session])).feedback,null)
 await role('service_role')
 const claim=async(worker='panel-worker')=>(await db.query<{id:string;job_type:string}>(`select * from claim_next_panel_job($1)`,[worker])).rows[0]
 // No unrelated attempt job is needed to wake the session-level stages.
 assert.equal(await scalar("select count(*)::int n from interview_processing_jobs where status in ('queued','failed','running')"),0)
 assert.equal(await call<boolean>(panelDispatchExists),true)
 const assess=await claim();assert.equal(assess.job_type,'assess');assert.equal(await claim('other-worker'),undefined)
 assert.equal(await call('complete_panel_job($1,\'other-worker\',$2::jsonb)',[assess.id,JSON.stringify({assessment:a,model:'synthetic'})]),false)
 assert.equal(await call('complete_panel_job($1,\'panel-worker\',$2::jsonb)',[assess.id,JSON.stringify({assessment:a,model:'synthetic'})]),true)
 assert.equal(await call<boolean>(panelDispatchExists),true)
 const audit=await claim();assert.equal(audit.job_type,'audit')
 assert.equal(await call('complete_panel_job($1,\'panel-worker\',$2::jsonb)',[audit.id,JSON.stringify({audit:{warnings:[],requires_human_attention:false},model:'synthetic'})]),true)
 assert.equal(await call<boolean>(panelDispatchExists),false)
 assert.equal(await call('(select status from interview_mock_markings)'), 'awaiting_review')
 const review=(f:unknown=a.feedback,version=0,checks=true,actor=admin,action='approve')=>call('review_whole_panel($1,$2,$3,$4,$5::jsonb,\'private notes\',\'private corrections\',$6,$6,$6,$6)',[id,actor,version,action,JSON.stringify(f),checks])
 await assert.rejects(review(a.feedback,0,true,owner));assert.equal(await review(a.feedback,1),'conflict');assert.equal(await review(a.feedback,0,false),'invalid_feedback')
 for(const f of [{...a.feedback,practice_task:'Do an exercise'},{...a.feedback,global_rating:{...a.feedback.global_rating,score:5.5}},{...a.feedback,domains:a.feedback.domains.map((d,i)=>i===0?{...d,evidence:['Q1-Q1']}:d)}])assert.equal(await review(f),'invalid_feedback')
 assert.equal(await review(a.feedback,0,true,admin,'save'),'saved');assert.equal(await review(),'conflict')
 assert.equal(await call('retry_panel_job($1,$2,\'assess\')',[id,admin]),'not_eligible')
 await role('authenticated');assert.equal((await call<{feedback:unknown}>('get_my_panel_report($1)',[session])).feedback,null);await role('service_role')
 await db.query('update interview_attempts set transcript=transcript||\' changed\' where id=$1',[members[0].id]);assert.equal(await review(a.feedback,1),'source_changed');await db.query('update interview_attempts set transcript=$2 where id=$1',[members[0].id,members[0].transcript])
 await db.query("delete from storage.objects where name=$1",[`${owner}/${members[0].id}/response.webm`]);assert.equal(await review(a.feedback,1),'media_missing');await db.query("insert into storage.objects(bucket_id,name) values('interview-recordings',$1)",[`${owner}/${members[0].id}/response.webm`])
 assert.equal(await review(a.feedback,1),'released');assert.equal(await review(a.feedback,1),'already_released')
 assert.equal(await scalar("select count(*)::int n from interview_attempts where marking_status='released'"),10);assert.equal(await scalar('select count(*)::int n from interview_attempts where approved_feedback is not null'),0)
 assert.equal(await scalar("select count(*)::int n from interview_mock_marking_events where event_type='released'"),1)
 assert.equal(await call('refund_whole_panel($1,$2,\'reason\')',[id,admin]),'not_eligible')
 await role('authenticated');const report=await call<{feedback:unknown}>('get_my_panel_report($1)',[session]);assert.deepEqual(report.feedback,a.feedback);assert.ok(!JSON.stringify(report).includes('private notes'));assert.equal((await call<unknown[]>('get_my_panel_report_index()')).length,1)
 await role('authenticated',admin);assert.equal(await call('get_my_panel_report($1)',[session]),null);assert.deepEqual(await call('get_my_panel_report_index()'),[])
 }finally{await db.close()}
})
test('tutor can edit and save the AI panel draft while audit is pending, and the audit preserves those edits',async()=>{
 const db=await fullDatabase(),members=panelMembers(7),a=panelFixture(members)
 const call=async<T=string>(sql:string,args:unknown[]=[]) => (await db.query<{r:T}>(`select ${sql} r`,args)).rows[0].r
 try{
  await db.exec(`insert into auth.users(id) values('${owner}'),('${admin}');update profiles set mmi_credits=30 where id='${owner}';update profiles set role='admin' where id='${admin}';`)
  for(const m of members){
   await db.query(`insert into interview_attempts(id,user_id,format,station_id,station_title,recording_path,recording_mime_type,media_kind,upload_status,marking_preflight_at,station_snapshot,questions,duration_seconds,transcript,transcription_status) values($1,$2,'panel','test',$3,$4,'video/webm','video','ready',now(),$5::jsonb,$6::jsonb,120,$7,'ready')`,[m.id,owner,m.station_title,`${owner}/${m.id}/response.webm`,JSON.stringify(m.station_snapshot),JSON.stringify(m.questions),m.transcript])
   await db.query("insert into storage.objects(bucket_id,name) values('interview-recordings',$1)",[`${owner}/${m.id}/response.webm`])
  }
  assert.equal((await call<{status:string}>('submit_whole_panel_for_marking($1,$2,12,10)',[session,owner])).status,'submitted')
  const id=await call<string>('(select id from interview_mock_markings)'),assess=(await db.query<{id:string}>("select * from claim_next_panel_job('worker')")).rows[0]
  assert.equal(await call('complete_panel_job($1,\'worker\',$2::jsonb)',[assess.id,JSON.stringify({assessment:a,model:'synthetic'})]),true)
  const draft=structuredClone(a.feedback);draft.closing_paragraph='Tutor edit saved before the automated evidence audit finished.'
  assert.equal(await call('review_whole_panel($1,$2,0,\'save\',$3::jsonb,\'notes\',\'corrections\',false,false,false,false)',[id,admin,JSON.stringify(draft)]),'saved')
  assert.equal(await call('(select status from interview_mock_markings)'),'processing')
  assert.equal(await call("(select status from interview_mock_processing_jobs where job_type='audit')"),'queued')
  await db.exec("update interview_mock_processing_jobs set status='dead' where job_type='audit';update interview_mock_markings set status='needs_attention'")
  assert.equal(await call('retry_panel_job($1,$2,\'audit\')',[id,admin]),'queued')
  assert.equal(await call<string>("(select draft_feedback->>'closing_paragraph' from interview_mock_markings)"),draft.closing_paragraph)
  const audit=(await db.query<{id:string}>("select * from claim_next_panel_job('auditor')")).rows[0]
  assert.equal(await call('complete_panel_job($1,\'auditor\',$2::jsonb)',[audit.id,JSON.stringify({audit:{warnings:[],requires_human_attention:false},model:'synthetic'})]),true)
  assert.equal(await call('(select status from interview_mock_markings)'),'in_review')
  assert.equal(await call<string>("(select draft_feedback->>'closing_paragraph' from interview_mock_markings)"),draft.closing_paragraph)
  assert.equal(await call<number>("(select count(*)::int from interview_attempts where marking_status='in_review')"),10)
  assert.equal(await call('review_whole_panel($1,$2,2,\'approve\',$3::jsonb,\'notes\',\'corrections\',true,true,true,true)',[id,admin,JSON.stringify(draft)]),'released')
 }finally{await db.close()}
})
test('whole-panel submission rejects malformed sessions; recovery/refund is idempotent and fences late results',async()=>{
 const db=await fullDatabase();const call=async<T=string>(sql:string,args:unknown[]=[]) => (await db.query<{r:T}>(`select ${sql} r`,args)).rows[0].r
 try{
 await db.exec(`insert into auth.users(id) values('${owner}'),('${admin}');update profiles set mmi_credits=30 where id='${owner}';update profiles set role='admin' where id='${admin}';`)
 const rows=panelMembers()
 for(const m of rows){await db.query(`insert into interview_attempts(id,user_id,format,station_id,station_title,recording_path,recording_mime_type,media_kind,upload_status,marking_preflight_at,station_snapshot,questions,duration_seconds,transcript,transcription_status) values($1,$2,'panel','test',$3,$4,'video/webm','video','ready',now(),$5::jsonb,$6::jsonb,120,$7,'ready')`,[m.id,owner,m.station_title,`${owner}/${m.id}/response.webm`,JSON.stringify(m.station_snapshot),JSON.stringify(m.questions),m.transcript]);await db.query("insert into storage.objects(bucket_id,name) values('interview-recordings',$1)",[`${owner}/${m.id}/response.webm`])}
 const submit=()=>call<{status:string}>('submit_whole_panel_for_marking($1,$2,12)',[session,owner])
 for(const mutation of ["format='mmi'","station_snapshot=jsonb_set(station_snapshot,'{mock_session,index}','0')","video_deleted_at=now()","upload_status='uploading'","user_id='00000000-0000-4000-8000-000000000002'"]){await db.exec(`update interview_attempts set ${mutation} where id='${rows[9].id}'`);assert.equal((await submit()).status,'not_ready',mutation);await db.query("update interview_attempts set format='panel',station_snapshot=$2::jsonb,video_deleted_at=null,upload_status='ready',user_id=$3 where id=$1",[rows[9].id,JSON.stringify(rows[9].station_snapshot),owner])}
 await db.exec(`update interview_attempts set marking_status='queued' where id='${rows[9].id}'`);assert.equal((await submit()).status,'legacy_response_marks');await db.exec('update interview_attempts set marking_status=null')
 await db.exec(`update profiles set mmi_credits=0 where id='${owner}'`);assert.equal((await submit()).status,'no_credits');await db.exec(`update profiles set mmi_credits=30 where id='${owner}'`)
 assert.equal((await submit()).status,'submitted');const id=await call<string>('(select id from interview_mock_markings)')
 let j=(await db.query<{id:string}>("select * from claim_next_panel_job('worker')")).rows[0]
 assert.equal(await call('fail_panel_job($1,\'wrong\',\'timeout\',10)',[j.id]),false)
 assert.equal(await call('fail_panel_job($1,\'worker\',\'timeout\',10)',[j.id]),true)
 assert.equal(await call('retry_panel_job($1,$2,\'assess\')',[id,admin]),'queued');assert.equal(await call('retry_panel_job($1,$2,\'assess\')',[id,admin]),'already_queued')
 j=(await db.query<{id:string}>("select * from claim_next_panel_job('new-worker')")).rows[0]
 assert.equal(await call('complete_panel_job($1,\'worker\',$2::jsonb)',[j.id,JSON.stringify({assessment:panelFixture(),model:'synthetic'})]),false)
 await db.exec("update interview_mock_processing_jobs set locked_at=now()-interval '11 minutes',attempt_count=max_attempts")
 assert.equal((await db.query("select * from claim_next_panel_job('reclaimer')")).rows.length,0);assert.equal(await call('(select status from interview_mock_markings)'),'needs_attention')
 await assert.rejects(call('refund_whole_panel($1,$2,\'test\')',[id,owner]));assert.equal(await call('refund_whole_panel($1,$2,\'test\')',[id,admin]),'refunded');assert.equal(await call('refund_whole_panel($1,$2,\'test\')',[id,admin]),'already_refunded')
 assert.equal(await call<number>(`(select mmi_credits from profiles where id='${owner}')`),30);assert.equal(await call('retry_panel_job($1,$2,\'assess\')',[id,admin]),'not_eligible');assert.equal(await call('complete_panel_job($1,\'new-worker\',$2::jsonb)',[j.id,JSON.stringify({assessment:panelFixture(),model:'synthetic'})]),false)
 }finally{await db.close()}
})

test('six-response panel: atomic 12-credit charge, one assessment/report, missing global score and frozen membership',async()=>{
 const db=await fullDatabase(),members=panelMembers().slice(0,6)
 const call=async<T=string>(sql:string,args:unknown[]=[]) => (await db.query<{r:T}>(`select ${sql} r`,args)).rows[0].r
 try{
  await db.exec(`insert into auth.users(id) values('${owner}'),('${admin}');update profiles set mmi_credits=75 where id='${owner}';update profiles set role='admin' where id='${admin}';`)
  for(const m of members){await db.query(`insert into interview_attempts(id,user_id,format,station_id,station_title,recording_path,recording_mime_type,media_kind,upload_status,marking_preflight_at,station_snapshot,questions,duration_seconds,transcript,transcription_status) values($1,$2,'panel','test',$3,$4,'video/webm','video','ready',now(),$5::jsonb,$6::jsonb,120,$7,'ready')`,[m.id,owner,m.station_title,`${owner}/${m.id}/response.webm`,JSON.stringify(m.station_snapshot),JSON.stringify(m.questions),m.transcript]);await db.query("insert into storage.objects(bucket_id,name) values('interview-recordings',$1)",[`${owner}/${m.id}/response.webm`]);
   if(m.id===members[0].id){
    await db.exec('set role service_role')
    for(const args of ['$1,$2,12','$1,$2,12,1']){
     const rejected=await call<{status:string;charged:number}>(`submit_whole_panel_for_marking(${args})`,[session,owner])
     assert.equal(rejected.status,'not_ready');assert.equal(rejected.charged,0)
    }
    assert.equal(await call<number>(`(select mmi_credits from profiles where id='${owner}')`),75)
    assert.equal(await call<number>('(select count(*)::int from interview_mock_markings)'),0)
    assert.equal(await call<number>('(select count(*)::int from interview_mock_processing_jobs)'),0)
    await db.exec('reset role')
   }
  }
  await db.exec(`set role authenticated;set request.jwt.claim.sub='${owner}'`)
  assert.equal(await call('submit_interview_for_marking($1,1)',[members[0].id]),'whole_panel_required')
  await db.exec('reset role;set role service_role')
  const submit=(n=6)=>call<{status:string;charged:number}>('submit_whole_panel_for_marking($1,$2,12,$3)',[session,owner,n])
  assert.equal((await submit(10)).status,'quote_changed')
  assert.equal((await call<{status:string}>('submit_whole_panel_for_marking($1,$2,1,6)',[session,owner])).status,'quote_changed')
  assert.equal((await submit()).charged,12);assert.equal((await submit()).charged,0)
  assert.equal(await call<number>(`(select mmi_credits from profiles where id='${owner}')`),63)
  const id=await call<string>('(select id from interview_mock_markings)')
  assert.equal(await call<number>('(select count(*)::int from interview_mock_marking_members)'),6)
  assert.equal(await call<number>('(select count(*)::int from interview_markings)'),0)
  assert.equal(await call('panel_members_ready($1)',[id]),true)
  const a=panelFixture(members);a.feedback.global_rating={score:null,band:null,basis:'Only six responses were supplied.'}
  const claim=async()=>(await db.query<{id:string;job_type:string}>("select * from claim_next_panel_job('partial-worker')")).rows[0]
  const assess=await claim();assert.equal(assess.job_type,'assess')
  assert.equal(await call('complete_panel_job($1,\'partial-worker\',$2::jsonb)',[assess.id,JSON.stringify({assessment:a,model:'synthetic'})]),true)
  const audit=await claim();assert.equal(audit.job_type,'audit')
  assert.equal(await call('complete_panel_job($1,\'partial-worker\',$2::jsonb)',[audit.id,JSON.stringify({audit:{warnings:[],requires_human_attention:false},model:'synthetic'})]),true)
  const review=(feedback:unknown)=>call("review_whole_panel($1,$2,0,'approve',$3::jsonb,'','',true,true,true,true)",[id,admin,JSON.stringify(feedback)])
  assert.equal(await review({...a.feedback,global_rating:{score:5,band:'Good',basis:'Unjustified complete score'}}),'invalid_feedback')
  assert.equal(await review(a.feedback),'released')
  assert.equal(await call<number>("(select count(*)::int from interview_attempts where marking_status='released')"),6)
  assert.equal((await submit()).status,'already_submitted')
 }finally{await db.close()}
})
