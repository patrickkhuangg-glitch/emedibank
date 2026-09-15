import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildCompetencyMastery, buildConsistency, buildInterviewRewards, buildReviewQueue, calculateConsistencyStreak, competenciesForStation, inferredReviewStage, practiceLevelFromXp, reviewStationForCompetency, selectDailyStation, streakExpiryAt, streakTimeRemaining, type CompetencyMastery } from '../src/lib/interviews/progression'
import { shiftDay, type PracticeLog } from '../src/lib/interviews/practice-progress'

const today = '2026-09-14'
const log = (id: string, stationId: string, day: string, rating: number | null = 3, duration = 90): PracticeLog => ({ id, station_id: stationId, format: stationId.startsWith('panel') ? 'panel' : 'mmi', source: 'recording', completed_at: `${day}T01:00:00Z`, duration_seconds: duration, self_rating: rating })

test('competencies are stable, bounded and medically relevant', () => {
  assert.deepEqual(competenciesForStation('mmi-team-disagreement'), ['communication', 'teamwork'])
  assert.ok(competenciesForStation('mmi-confidentiality-patient-safety').includes('ethical_reasoning'))
  assert.ok(competenciesForStation('panel-motivation').includes('motivation_for_medicine'))
  assert.ok(competenciesForStation('mmi-listening-concern').length <= 3)
})

test('mastery needs repeated evidence and old evidence decays gradually', () => {
  const oneHigh = buildCompetencyMastery([log('one','mmi-team-disagreement',today,5)], today).find(item => item.competency === 'teamwork')!
  assert.equal(oneHigh.state, 'Developing')
  assert.ok(oneHigh.score < 60)
  const repeated = buildCompetencyMastery(Array.from({ length: 7 }, (_, index) => log(String(index),'mmi-team-disagreement',shiftDay(today,-index*2),5)), today).find(item => item.competency === 'teamwork')!
  assert.equal(repeated.state, 'Interview-ready')
  const faded = buildCompetencyMastery(Array.from({ length: 7 }, (_, index) => log(String(index),'mmi-team-disagreement',shiftDay(today,-120-index),5)), today).find(item => item.competency === 'teamwork')!
  assert.ok(faded.retention < repeated.retention)
  assert.ok(faded.score > 0)
})

test('reviewed tutor evidence takes precedence without double-counting an attempt', () => {
  const attempt = log('reviewed','mmi-team-disagreement',today,2)
  const mastery = buildCompetencyMastery([attempt], today, [{ competency:'teamwork',practiceLogId:attempt.id,source:'tutor',score:6/7,observedAt:attempt.completed_at! }]).find(item => item.competency === 'teamwork')!
  assert.equal(mastery.attempts, 1)
  assert.ok(mastery.score > 40)
})

test('the Daily Station is deterministic for the local day and retains a stored assignment', () => {
  const mastery = buildCompetencyMastery([], today)
  const first = selectDailyStation('student-a', today, mastery, [])
  const refreshed = selectDailyStation('student-a', today, mastery, [])
  assert.equal(first.stationId, refreshed.stationId)
  const stored = selectDailyStation('student-a', shiftDay(today,1), mastery, [], { id: 'stored', stationId: first.stationId })
  assert.equal(stored.stationId, first.stationId)
  assert.equal(stored.id, 'stored')
})

test('review queue is capped and uses a different scenario for the same competency', () => {
  const base: CompetencyMastery = { competency:'communication',label:'Communication',state:'Developing',score:40,trend:'Steady',retention:20,attempts:2,strongestBehaviour:'Clear explanation',nextAction:'Explain clearly',lastPractised:shiftDay(today,-10),reviewDue:true,reviewReason:'Revisit clear explanations.',history:[],stationIds:['mmi-team-disagreement'] }
  const mastery = ['communication','empathy','ethical_reasoning','teamwork','reflection'].map((competency,index) => ({ ...base, competency: competency as CompetencyMastery['competency'], label: competency, retention: index }))
  const reviews = buildReviewQueue(mastery, today)
  assert.equal(reviews.length, 3)
  assert.ok(reviews.every(review => !review.href.includes('station=mmi-team-disagreement&')))
  assert.notEqual(reviewStationForCompetency('teamwork','mmi-team-disagreement').id,'mmi-team-disagreement')
  assert.equal(inferredReviewStage({ ...base, score: 80 }),4)
})

test('consistency uses a daily streak plus a five-day weekly activity goal', () => {
  const logs = [0,1,2].map(index => log(String(index),'mmi-team-disagreement',shiftDay(today,-index),4,90))
  const streak = calculateConsistencyStreak(logs, today, true)
  assert.equal(streak.days, 3)
  const progress = buildConsistency(logs, today, streak.days, 4, true)
  assert.equal(progress.activeDays, 1)
  assert.equal(progress.todayActive, true)
  assert.equal(progress.expiresAt, '2026-09-15T14:00:00.000Z')
  assert.equal(progress.personalBestDays, 4)
  assert.match(progress.message, /left|Welcome back/)
  assert.equal(buildConsistency([log('short','mmi-team-disagreement',today,3,5)], today).activeDays, 0)
})

test('daily streak expiry follows Sydney midnight and gives a readable countdown', () => {
  assert.equal(streakExpiryAt('2026-04-04', false), '2026-04-04T13:00:00.000Z')
  assert.equal(streakExpiryAt('2026-10-03', false), '2026-10-03T14:00:00.000Z')
  assert.equal(streakTimeRemaining('2026-09-15T14:00:00.000Z', Date.parse('2026-09-14T03:30:00.000Z')), '1d 10h')
})

test('an unfinished current day does not break a daily streak', () => {
  const logs = [1,2].map(index => log(String(index),'mmi-team-disagreement',shiftDay(today,-index),4,90))
  assert.equal(calculateConsistencyStreak(logs, today, false).days, 2)
})

test('practice levels reward lifetime participation and badges remain evidence-labelled', () => {
  assert.deepEqual(practiceLevelFromXp(0), { number:1,name:'Getting Started',totalXp:0,progress:0,toNext:100,nextName:'Finding Your Voice' })
  assert.equal(practiceLevelFromXp(249).number, 2)
  assert.equal(practiceLevelFromXp(2700).name, 'Interview Prepared')
  const rewards = buildInterviewRewards(250, 3, [{ badge_key:'feedback_in_action',earned_at:'2026-09-14T01:00:00Z' }])
  assert.equal(rewards.level.name, 'Building Structure')
  assert.equal(rewards.focusTokens, 3)
  assert.equal(rewards.badges.filter(item => item.earnedAt).length, 1)
  assert.ok(rewards.badges.every(item => item.criterion.length > 20))
})
