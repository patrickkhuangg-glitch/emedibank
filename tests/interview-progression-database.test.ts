import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fullDatabase } from './helpers/full-database.mjs'

test('Daily Station XP transitions are private, meaningful and idempotent', async () => {
  const db = await fullDatabase()
  const user = '90000000-0000-4000-8000-000000000001'
  const first = '10000000-0000-4000-8000-000000000001'
  const retry = '10000000-0000-4000-8000-000000000002'
  try {
    await db.exec(`insert into auth.users(id,email) values('${user}','student@example.test'); update profiles set full_name='Student One',role='student' where id='${user}';
      insert into interview_feedback_quests(id,user_id,behaviour,competencies) values('20000000-0000-4000-8000-000000000001','${user}','Acknowledge the patient perspective before proposing action.',array['empathy']);
      insert into interview_daily_stations(id,user_id,local_day,station_id,format,competencies,reason,quest_id) values('30000000-0000-4000-8000-000000000001','${user}','2026-09-14','mmi-listening-concern','mmi',array['empathy','communication'],'Build empathy.','20000000-0000-4000-8000-000000000001');
      insert into interview_attempts(id,user_id,format,station_id,station_title,recording_path,recording_mime_type,media_kind,upload_status,duration_seconds,created_at) values('${first}','${user}','mmi','mmi-listening-concern','Responding to a concern','${user}/${first}/practice.webm','audio/webm','audio','awaiting_upload',90,'2026-09-13T15:00:00Z');
      update interview_attempts set upload_status='ready' where id='${first}';`)
    let profile = (await db.query<{total_xp:number}>('select total_xp from interview_progression_profiles where user_id=$1',[user])).rows[0]
    assert.equal(profile.total_xp,20)
    await db.exec(`update interview_attempts set upload_status='ready' where id='${first}'`)
    assert.equal((await db.query('select * from interview_progression_events')).rows.length,1)

    await db.exec(`update interview_attempts set transcript='I acknowledged the concern before explaining a safe next step.',transcription_status='ready' where id='${first}'; set role authenticated; set request.jwt.claim.sub='${user}';`)
    const reviewed = await db.query<{record_interview_progression_action:{status:string;xp:number}}>("select record_interview_progression_action($1,'review')",[first])
    assert.deepEqual(reviewed.rows[0].record_interview_progression_action,{status:'reviewed',xp:10})
    const duplicateReview = await db.query<{record_interview_progression_action:{status:string;xp:number}}>("select record_interview_progression_action($1,'review')",[first])
    assert.equal(duplicateReview.rows[0].record_interview_progression_action.xp,0)
    await db.exec(`reset role; insert into interview_attempts(id,user_id,format,station_id,station_title,recording_path,recording_mime_type,media_kind,upload_status,duration_seconds,created_at) values('${retry}','${user}','mmi','mmi-listening-concern','Responding to a concern','${user}/${retry}/practice.webm','audio/webm','audio','awaiting_upload',95,'2026-09-13T16:00:00Z'); update interview_attempts set upload_status='ready' where id='${retry}';`)
    profile = (await db.query<{total_xp:number}>('select total_xp from interview_progression_profiles where user_id=$1',[user])).rows[0]
    assert.equal(profile.total_xp,55)
    await db.exec(`set role authenticated; set request.jwt.claim.sub='${user}';`)
    const improved = await db.query<{record_interview_progression_action:{status:string;xp:number;focus_tokens:number}}>("select record_interview_progression_action($1,'demonstrate',$2)",[retry,'I named the concern first and checked the proposed next step.'])
    assert.equal(improved.rows[0].record_interview_progression_action.xp,15)
    assert.equal(improved.rows[0].record_interview_progression_action.focus_tokens,1)
    const duplicate = await db.query<{record_interview_progression_action:{status:string;xp:number}}>("select record_interview_progression_action($1,'demonstrate',$2)",[retry,'I named the concern first and checked the proposed next step.'])
    assert.equal(duplicate.rows[0].record_interview_progression_action.xp,0)
    await db.exec('reset role')
    assert.equal((await db.query<{total_xp:number;focus_tokens:number}>('select total_xp,focus_tokens from interview_progression_profiles where user_id=$1',[user])).rows[0].total_xp,70)
    assert.equal((await db.query<{focus_tokens:number}>('select focus_tokens from interview_progression_profiles where user_id=$1',[user])).rows[0].focus_tokens,1)
    assert.equal((await db.query('select * from interview_focus_token_events where user_id=$1',[user])).rows.length,1)
    assert.equal((await db.query<{demonstration_count:number}>('select demonstration_count from interview_feedback_quests where user_id=$1',[user])).rows[0].demonstration_count,1)
    await db.exec(`set role authenticated; set request.jwt.claim.sub='${user}';`)
    assert.equal((await db.query('select * from interview_progression_events')).rows.length,4)
    assert.ok((await db.query<{explanation:string}>('select explanation from interview_progression_events')).rows.every(row => row.explanation.length > 8))
    await db.exec(`reset role; update interview_attempts set marking_status='released',approved_feedback='{"global":{"score":6},"strengths":[{"text":"You acknowledge the concern before proposing action."}],"priorities":[{"text":"Check the patient understands the agreed next step."}]}'::jsonb where id='${retry}';`)
    const tutorQuest = (await db.query<{source:string;behaviour:string;tutor_override:boolean}>('select source,behaviour,tutor_override from interview_feedback_quests where user_id=$1 and status=$2',[user,'assigned'])).rows[0]
    assert.deepEqual(tutorQuest,{source:'tutor',behaviour:'Check the patient understands the agreed next step.',tutor_override:true})
    const tutorEvidence = (await db.query<{evidence_score:number;behaviour:string}>('select evidence_score::float8 evidence_score,behaviour from interview_competency_evidence where practice_log_id=$1 and source=$2 order by competency limit 1',[retry,'tutor'])).rows[0]
    assert.equal(tutorEvidence.behaviour,'You acknowledge the concern before proposing action.')
    assert.ok(tutorEvidence.evidence_score > .85)
  } finally { await db.close() }
})

test('weekly, spaced-review and full-circuit rewards are evidence-based and capped once', async () => {
  const db = await fullDatabase()
  const user = '90000000-0000-4000-8000-000000000011'
  try {
    await db.exec(`insert into auth.users(id,email) values('${user}','rewards@example.test'); update profiles set full_name='Reward Student',role='student' where id='${user}';`)
    for (let index = 0; index < 5; index++) {
      const day = String(7 + index).padStart(2, '0')
      const id = `11000000-0000-4000-8000-00000000000${index}`
      await db.exec(`insert into interview_practice_logs(id,user_id,station_id,format,source,started_at,completed_at,duration_seconds,self_rating) values('${id}','${user}','mmi-team-disagreement','mmi','rehearsal','2026-09-${day}T01:00:00Z','2026-09-${day}T01:02:00Z',120,4);`)
    }
    const weekly = (await db.query<{xp:number}>("select xp from interview_progression_events where user_id=$1 and event_type='consistency_week'",[user])).rows
    assert.deepEqual(weekly.map(row => row.xp),[50])
    assert.equal((await db.query<{focus_tokens:number}>('select focus_tokens from interview_progression_profiles where user_id=$1',[user])).rows[0].focus_tokens,1)

    const reviewId = '22000000-0000-4000-8000-000000000001'
    const reviewLog = '11000000-0000-4000-8000-000000000099'
    await db.exec(`insert into interview_spaced_reviews(id,user_id,competency,source_station_id,review_station_id,reason,interval_stage,due_day,status) values('${reviewId}','${user}','communication','mmi-team-disagreement','mmi-listening-concern','Check that this communication skill is still strong.',0,'2026-09-13','due');
      insert into interview_practice_logs(id,user_id,station_id,format,source,started_at,completed_at,duration_seconds,self_rating) values('${reviewLog}','${user}','mmi-listening-concern','mmi','rehearsal','2026-09-14T01:00:00Z','2026-09-14T01:02:00Z',120,4);`)
    const reviewRewards = (await db.query<{event_type:string;xp:number}>("select event_type,xp from interview_progression_events where user_id=$1 and event_type in ('spaced_review','retention_bonus') order by event_type",[user])).rows
    assert.deepEqual(reviewRewards,[{event_type:'retention_bonus',xp:10},{event_type:'spaced_review',xp:20}])
    assert.equal((await db.query("select * from interview_badges where user_id=$1 and badge_key='retention_proven'",[user])).rows.length,1)

    const mockId = '33000000-0000-4000-8000-000000000001'
    for (let index = 0; index < 8; index++) {
      const id = `44000000-0000-4000-8000-00000000000${index}`
      await db.exec(`insert into interview_attempts(id,user_id,format,station_id,station_title,recording_path,recording_mime_type,media_kind,upload_status,duration_seconds,station_snapshot) values('${id}','${user}','mmi','mmi-team-disagreement','Team disagreement','${user}/${id}/practice.webm','video/webm','video','awaiting_upload',90,'{"mock_session":{"id":"${mockId}","mode":"full","index":${index},"total":8}}'::jsonb);`)
    }
    await db.exec(`update interview_attempts set upload_status='ready' where user_id='${user}' and station_snapshot#>>'{mock_session,id}'='${mockId}';`)
    assert.deepEqual((await db.query<{xp:number}>("select xp from interview_progression_events where user_id=$1 and event_type='circuit'",[user])).rows,[{xp:75}])
    assert.equal((await db.query("select * from interview_badges where user_id=$1 and badge_key='circuit_composure'",[user])).rows.length,1)
    await db.exec(`update interview_attempts set upload_status='ready' where user_id='${user}' and station_snapshot#>>'{mock_session,id}'='${mockId}';`)
    assert.equal((await db.query("select * from interview_progression_events where user_id=$1 and event_type='circuit'",[user])).rows.length,1)
    assert.equal((await db.query<{focus_tokens:number}>('select focus_tokens from interview_progression_profiles where user_id=$1',[user])).rows[0].focus_tokens,2)
    for (let index = 0; index < 3; index++) await db.query('select award_interview_progression_xp($1,$2,$3,null,null,$4,$5)',[user,`extra-review-${index}`,'spaced_review',999,{}])
    assert.deepEqual((await db.query<{xp:number}>("select xp from interview_progression_events where user_id=$1 and event_type='spaced_review' order by created_at,id",[user])).rows.map(row=>row.xp).sort((a,b)=>a-b),[0,20,20,20])
    await assert.rejects(async()=>{await db.exec(`set role service_role; update interview_progression_events set xp=999 where user_id='${user}';`)},/permission denied/i)
  } finally { await db.close() }
})
