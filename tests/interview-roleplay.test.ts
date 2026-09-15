import test from 'node:test'
import assert from 'node:assert/strict'
import { ROLEPLAY_STATIONS } from '../src/lib/interviews/roleplay-stations'
import { INTERVIEW_STATIONS } from '../src/lib/interviews/stations'
import { ROLEPLAY_ASSESSMENT_SCOPE,roleplayPart } from '../src/lib/interviews/roleplay'
import { makeMockSteps,mockView,makeTrialMockSteps } from '../src/lib/interviews/mock-plan'
import { stationSnapshot,validateQuestionEvents } from '../src/lib/interviews/video-validation'
import { studentStation,trialStations } from '../src/lib/interviews/trial-stations'
import { mmiSource } from '../src/lib/interviews/mmi-evidence'
import type { MockTicket } from '../src/lib/interviews/mock-types'

test('role-play stations retain two questions, private actor briefs and fixed trial exclusion',()=>{
  assert.equal(ROLEPLAY_STATIONS.length,2)
  assert.equal(INTERVIEW_STATIONS.filter(s=>s.format==='mmi').length,208)
  for(const s of ROLEPLAY_STATIONS){
    assert.equal(s.questions.length,2)
    assert.ok(s.rolePlayerInstructions)
    const safe=studentStation(s)
    assert.ok(!('rolePlayerInstructions' in safe))
    assert.ok(!('examinerFeedback' in safe))
    assert.equal(safe.responseMode,'roleplay_reflection')
    assert.ok(!trialStations().some(t=>t.id===s.id))
    assert.throws(()=>makeTrialMockSteps({format:'mmi',mode:'individual',selectionId:s.id}))
  }
})

test('server releases only the current role-play part and keeps one ten-minute station',()=>{
  for(const s of ROLEPLAY_STATIONS){
    const steps=makeMockSteps({format:'mmi',mode:'individual',selectionId:s.id})
    assert.equal(steps.length,1)
    const ticket:MockTicket={version:1,id:'test',userId:'test',startedAt:0,format:'mmi',mode:'individual',steps}
    for(const now of [0,119999])assert.deepEqual(mockView(ticket,now).questions,[])
    for(const now of [120000,359999]){
      const v=mockView(ticket,now)
      assert.deepEqual(v.questions,[s.questions[0]])
      assert.equal(v.responsePart?.kind,'roleplay')
      assert.equal(v.phaseEndsAt,360000)
      assert.ok(!JSON.stringify(v).includes(s.questions[1]))
      assert.ok(!JSON.stringify(v).includes(s.rolePlayerInstructions!))
    }
    for(const now of [360000,599999]){
      const v=mockView(ticket,now)
      assert.equal(v.index,0);assert.equal(v.total,1)
      assert.deepEqual(v.questions,[s.questions[1]])
      assert.equal(v.responsePart?.questionIndex,1)
      assert.equal(v.phaseEndsAt,600000)
    }
    assert.equal(mockView(ticket,600000).phase,'complete')
  }
})

test('role-play phase timing works at boundaries and inside a full circuit',()=>{
  assert.equal(roleplayPart(239.999).questionIndex,0)
  assert.equal(roleplayPart(240).questionIndex,1)
  const role=makeMockSteps({format:'mmi',mode:'individual',selectionId:ROLEPLAY_STATIONS[0].id})[0]
  const other=makeMockSteps({format:'mmi',mode:'individual',selectionId:INTERVIEW_STATIONS[0].id})[0]
  const ticket:MockTicket={version:1,id:'test',userId:'test',startedAt:1000,format:'mmi',mode:'full',steps:[other,role,other]}
  assert.equal(mockView(ticket,961000).responsePart?.kind,'reflection')
  assert.equal(mockView(ticket,1201000).index,2)
  assert.equal(mockView(ticket,1201000).phase,'preparation')
  assert.equal(mockView(ticket,1201000).responsePart,undefined)
})

test('saved snapshots and marking evidence explicitly describe solo rehearsal, without leaking actor directions',()=>{
  const station=ROLEPLAY_STATIONS[0],snapshot=stationSnapshot('mmi',station.id)
  assert.equal(snapshot.timing.response_seconds,480)
  assert.equal(snapshot.response_mode,'roleplay_reflection')
  assert.deepEqual(snapshot.response_phases,[{question_index:0,duration_seconds:240},{question_index:1,duration_seconds:240}])
  assert.equal(snapshot.assessor_brief,ROLEPLAY_ASSESSMENT_SCOPE)
  assert.ok(!JSON.stringify(snapshot).includes(station.rolePlayerInstructions!))
  const source=mmiSource(snapshot,'I would ask what matters most to Taylor. I rushed into advice.')
  assert.ok(source.limitations.includes(ROLEPLAY_ASSESSMENT_SCOPE))
  assert.ok(source.references.every(r=>r.speaker!=='actor'))
  assert.deepEqual(validateQuestionEvents([{question_index:0,offset_seconds:0},{question_index:1,offset_seconds:240}],2,480),[{question_index:0,offset_seconds:0},{question_index:1,offset_seconds:240}])
  assert.ok(!('response_mode' in stationSnapshot('mmi',INTERVIEW_STATIONS[0].id)))
})
