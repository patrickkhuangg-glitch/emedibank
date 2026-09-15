import test from 'node:test'
import assert from 'node:assert/strict'
import { INTERVIEW_MARKETING as config, reviewAllowance, foundingOfferAvailable, aud } from '../src/lib/interviews/marketing'
import { INTERVIEW_STATIONS } from '../src/lib/interviews/stations'
import { STORY_PROMPTS } from '../src/lib/interviews/story-prompts'
import { TRIAL_MMI_IDS, TRIAL_PANEL_IDS } from '../src/lib/interviews/trial-catalog'

test('advertised catalog counts match the actual banks and trial selection', () => {
  assert.equal(config.counts.mmi, INTERVIEW_STATIONS.filter(s => s.format === 'mmi').length)
  assert.equal(config.counts.panelThemes, INTERVIEW_STATIONS.filter(s => s.format === 'panel').length)
  assert.equal(config.counts.stories, STORY_PROMPTS.length)
  assert.equal(config.trial.mmiStations, TRIAL_MMI_IDS.length)
  assert.equal(config.trial.panelThemes, TRIAL_PANEL_IDS.length)
})
test('credit examples are alternative uses, with correct circuit remainders', () => {
  assert.deepEqual(reviewAllowance(2), { mmi: 1, panel: 0, mocks: 0, remainder: 2 })
  assert.deepEqual(reviewAllowance(6), { mmi: 3, panel: 0, mocks: 0, remainder: 6 })
  assert.deepEqual(reviewAllowance(18), { mmi: 9, panel: 1, mocks: 1, remainder: 6 })
  assert.deepEqual(reviewAllowance(36), { mmi: 18, panel: 3, mocks: 3, remainder: 0 })
  assert.equal(aud(config.complete.price), 'A$1,299')
})
test('standalone checkout is available and access packages are one year', () => {
  assert.equal(config.paidPlansAvailable, true)
  assert.equal(config.durationMonths, 12)
  assert.equal(config.accessLabel, '1 year')
})
test('founding offer fails closed when stale, exhausted, expired or malformed', () => {
  const now = Date.parse('2026-09-08T12:00:00Z')
  const offer = { enabled: true, allocation: 25, sold: 24, closesAt: '2026-09-09T00:00:00Z', availabilityVerifiedAt: '2026-09-08T11:59:00Z' }
  assert.equal(foundingOfferAvailable(offer, now), true)
  for (const update of [{ enabled:false }, {sold:25}, {sold:-1}, {sold:1.5}, {closesAt:null}, {closesAt:'bad'}, {closesAt:'2026-09-08T12:00:00Z'}, {availabilityVerifiedAt:null}, {availabilityVerifiedAt:'2026-09-08T11:54:00Z'}, {availabilityVerifiedAt:'2026-09-08T12:01:00Z'}]) {
    assert.equal(foundingOfferAvailable({...offer,...update},now), false, JSON.stringify(update))
  }
})

test('date-only founding release expires exactly at closing time', () => {
  const closes = '2026-10-01T00:00:00Z'
  const offer = { enabled: true, allocation: null, sold: 0, closesAt: closes, availabilityVerifiedAt: null }
  assert.equal(foundingOfferAvailable(offer, Date.parse(closes) - 1), true)
  assert.equal(foundingOfferAvailable(offer, Date.parse(closes)), false)
  assert.equal(foundingOfferAvailable({...offer, closesAt: null}, Date.parse(closes) - 1), false)
})

test('approved offer covers 8 October in Sydney and returns to standard price at midnight', () => {
  const offer = config.complete.founding
  const beforeMidnight = Date.parse('2026-10-08T12:59:59.999Z')
  const midnight = Date.parse('2026-10-08T13:00:00Z')
  assert.equal(foundingOfferAvailable(offer, beforeMidnight), true)
  assert.equal(foundingOfferAvailable(offer, midnight), false)
  assert.equal(offer.price, 999)
  assert.equal(config.complete.price, 1299)
})
