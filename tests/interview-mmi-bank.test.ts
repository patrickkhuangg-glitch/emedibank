import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { INTERVIEW_STATIONS, getInterviewStation } from '../src/lib/interviews/stations'
import { ROLEPLAY_STATIONS } from '../src/lib/interviews/roleplay-stations'
import { REVIEWED_MMI_STATIONS_2026_09 as additions } from '../src/lib/interviews/mmi-bank-2026-09'
import { INTERVIEW_STATION_METADATA } from '../src/lib/interviews/station-metadata'
import { TRIAL_MMI_IDS, TRIAL_PANEL_IDS, trialQuestionAllowed } from '../src/lib/interviews/trial-catalog'
import { trialStations, studentStation } from '../src/lib/interviews/trial-stations'
import { makeMockSteps, makeTrialMockSteps, mockOptions, mockView } from '../src/lib/interviews/mock-plan'
import { themeForStation } from '../src/lib/interviews/practice-progress'
import manifest from '../docs/mmi-bank-audit/import-manifest.json'
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')

test('reviewed import accounts for every source station and excludes the 24 held items', () => {
  assert.equal(additions.length, 132)
  assert.equal(INTERVIEW_STATIONS.filter(s => s.format === 'mmi').length, 208)
  assert.equal(new Set(INTERVIEW_STATIONS.map(s => s.id)).size, INTERVIEW_STATIONS.length)
  assert.deepEqual([...manifest.accepted.map(s => s.sourceNumber), ...manifest.heldSourceNumbers].sort((a,b) => a-b), Array.from({length:156},(_,i)=>i+1))
  assert.equal(manifest.heldSourceNumbers.length,24)
  assert.deepEqual(additions.map(s => s.id), manifest.accepted.map(s => s.stationId))
  for (const station of additions) {
    assert.equal(station.questions.length,4)
    assert.equal(new Set(station.questions).size,4)
    assert.ok(station.preparation.trim().length > 100)
    assert.ok(station.examinerFeedback?.strongResponse.length)
    assert.ok(station.examinerFeedback?.commonWeaknesses.length)
    assert.equal(getInterviewStation('mmi', station.id),station)
  }
})

test('existing MMI content, panel bank and free-trial selections are unchanged', () => {
  assert.equal(hash(INTERVIEW_STATIONS.filter(s => s.format === 'mmi' && !s.id.startsWith('mmi-bank-2026-09-') && !ROLEPLAY_STATIONS.some(r=>r.id===s.id))), 'c22d5581d1fd26dc3562056c565e2ceaa29dd17c0d9b2c5065df83f83217fb65')
  assert.equal(hash(INTERVIEW_STATIONS.filter(s => s.format === 'panel')), '7ed65b842ae0c0794c85399cc88a6ccfe48be7660956983e5b603e1a9328e895')
  assert.equal(hash([TRIAL_MMI_IDS,TRIAL_PANEL_IDS]), '413722c0225c01ad0792152f34edeb94415e4f43a2440d474395805f48514b67')
  assert.equal(trialStations().filter(s => s.format === 'mmi').length,15)
  assert.ok(trialStations().every(s => !('examinerFeedback' in s)))
  for (const station of additions) {
    assert.equal(trialQuestionAllowed(station.id),false)
    assert.ok(!mockOptions(true).some(s => s.id === station.id))
    assert.throws(() => makeTrialMockSteps({format:'mmi',mode:'individual',selectionId:station.id}))
  }
})

test('public metadata matches all stations without leaking scenarios or answer guides', () => {
  assert.deepEqual(INTERVIEW_STATION_METADATA.map(s=>s.id),INTERVIEW_STATIONS.map(s=>s.id))
  for(const station of INTERVIEW_STATIONS) {
    const metadata=INTERVIEW_STATION_METADATA.find(s=>s.id===station.id)!
    assert.equal(metadata.title,station.title)
    assert.equal(metadata.category,station.category)
    assert.equal(metadata.questionCount,station.questions.length)
    assert.ok(Object.keys(metadata).every(k => ['id','format','title','category','questionCount','panelThemeNumber'].includes(k)))
    assert.equal(themeForStation(station.id),station.category.split(' · ')[0])
    assert.ok(!('examinerFeedback' in studentStation(station)))
  }
})

test('every addition supports individual timed MMI practice and full-circuit selection', () => {
  for(const station of additions) {
    const selection={format:'mmi' as const, mode:'individual' as const,selectionId:station.id}
    const steps=makeMockSteps(selection)
    assert.deepEqual(steps,[{stationId:station.id,questionIndex:0,preparationSeconds:120,responseSeconds:480}])
    const ticket={...selection,version:1 as const,id:'review',userId:'test',startedAt:0,steps}
    assert.equal(mockView(ticket,0).preparation,station.preparation)
    assert.deepEqual(mockView(ticket,119999).questions,[])
    assert.deepEqual(mockView(ticket,120000).questions,station.questions)
    assert.equal(mockView(ticket,600000).phase,'complete')
  }
  let seed=31
  const random=()=>{ seed=(Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296 }
  const seen=new Set<string>()
  for(let run=0;run<32;run++) {
    const full=makeMockSteps({format:'mmi',mode:'full'},random)
    assert.equal(new Set(full.map(s=>s.stationId)).size,8)
    for(const step of full) seen.add(step.stationId)
  }
  assert.ok(additions.some(station=>seen.has(station.id)))
  assert.equal(mockOptions().length,208)
})
