import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { cognitiveTotal, decisionMakingMarks, estimateAnzSjtScore, estimateCognitiveScore, referenceCognitiveScore, estimateSjtBand, summariseMarks } from '../src/lib/ucat/scoring'
import { buildCalibrationDraft, scoreWithCalibration, type CalibrationAttempt, type CalibrationModel, type CalibrationIdentity } from '../src/lib/ucat/calibration'
import { gridMarkValue } from '../src/lib/practice/marks'
import { UCAT_ANZ_2026, estimateAnzPercentile, percentileLabel } from '../src/lib/ucat/benchmarks'
import { QR_TOP_SCORE_BY_FORM } from '../src/lib/mock/config'

const reference = JSON.parse(readFileSync(new URL('./fixtures/ucat-reference-scores.json', import.meta.url), 'utf8'))

test('ANZ percentiles match every published decile and quartile for each section and total', () => {
  for (const [section, row] of Object.entries(UCAT_ANZ_2026.sections)) {
    row.deciles.forEach((score, i) => assert.deepEqual(estimateAnzPercentile(section, score), { kind: 'estimate', value: (i + 1) * 10 }))
    row.quartiles.forEach((score, i) => assert.deepEqual(estimateAnzPercentile(section, score), { kind: 'estimate', value: (i + 1) * 25 }))
  }
})

test('percentiles interpolate within published anchors but never invent ranks in the tails', () => {
  assert.deepEqual(estimateAnzPercentile('quantitative-reasoning', 750), { kind: 'estimate', value: 68 })
  assert.deepEqual(estimateAnzPercentile('quantitative-reasoning', 600), { kind: 'estimate', value: 28 })
  assert.deepEqual(estimateAnzPercentile('quantitative-reasoning', 890), { kind: 'above', boundary: 90 })
  assert.deepEqual(estimateAnzPercentile('quantitative-reasoning', 900), { kind: 'above', boundary: 90 })
  assert.deepEqual(estimateAnzPercentile('quantitative-reasoning', 300), { kind: 'below', boundary: 10 })
  assert.equal(estimateAnzPercentile('unknown', 600), null)
  assert.equal(estimateAnzPercentile('toString', 600), null)
  for (const score of [NaN, Infinity, 299, 901]) assert.equal(estimateAnzPercentile('quantitative-reasoning', score), null)
  assert.equal(estimateAnzPercentile('total', 899), null)
  assert.equal(percentileLabel({ kind: 'estimate', value: 68 }), 'Approximately 68th percentile')
  assert.equal(percentileLabel({ kind: 'estimate', value: 21 }), 'Approximately 21st percentile')
  assert.equal(percentileLabel({ kind: 'estimate', value: 12 }), 'Approximately 12th percentile')
})

test('QR reserves 900 for 36 by default or 35 on a harder form, with monotonic scores', () => {
  assert.deepEqual([32,33,34,35,36].map(raw => estimateCognitiveScore('quantitative-reasoning', raw)), [850,860,880,890,900])
  assert.deepEqual([32,33,34,35,36].map(raw => estimateCognitiveScore('quantitative-reasoning', raw, 36, 35)), [850,870,880,900,900])
  for (const threshold of [35,36] as const) {
    let previous = 300
    for (let raw = 0; raw <= 36; raw++) {
      const score = estimateCognitiveScore('quantitative-reasoning', raw, 36, threshold)
      assert(score >= previous)
      assert.equal(score === 900, raw >= threshold)
      previous = score
    }
  }
  assert(Object.values(QR_TOP_SCORE_BY_FORM).every(threshold => threshold === 36))
  assert.equal(estimateCognitiveScore('quantitative-reasoning', 99, 100), 890)
})

test('2026 ANZ benchmark transcription preserves the published figures and total', () => {
  const data = UCAT_ANZ_2026
  assert.equal(data.candidates, 17341)
  assert.deepEqual(Object.values(data.sections).map(s => s.mean), [619,655,691,1964,580])
  assert.deepEqual(data.sections['quantitative-reasoning'].deciles, [530,580,610,640,680,710,760,820,880])
  assert.deepEqual(data.sections.total.quartiles, [1760,1950,2170])
  for (const row of Object.values(data.sections)) {
    assert.equal(row.quartiles[1], row.deciles[4])
    assert(row.deciles.every((value, index, values) => index === 0 || value >= values[index - 1]))
  }
})

test('all 236 integer inputs match the observed reference calculator, including DM partial mode', () => {
  reference['raw-vr'].forEach((score: string, raw: number) => assert.equal(estimateCognitiveScore('verbal-reasoning', raw), Number(score)))
  reference['raw-qr'].forEach((score: string, raw: number) => assert.equal(referenceCognitiveScore('quantitative-reasoning', raw), Number(score)))
  reference.dm.forEach((score: string, raw: number) => assert.equal(estimateCognitiveScore('decision-making', raw, 35), Number(score)))
  reference.dmPartial.forEach((score: string, raw: number) => assert.equal(estimateCognitiveScore('decision-making', raw), Number(score)))
  reference['raw-sj'].forEach((score: string, raw: number) => assert.equal(`Band ${estimateSjtBand(raw)}`, score))
})

test('DM counts full and partial marks separately and rejects overlapping counts', () => {
  const example = reference.partialComposition
  assert.equal(decisionMakingMarks(example.oneMarkCorrect, example.twoMarkCorrect, example.partiallyCorrect), example.raw)
  assert.equal(estimateCognitiveScore('decision-making', example.raw), example.scaled)
  assert.equal(decisionMakingMarks(23, 12, 0), 47)
  assert.throws(() => decisionMakingMarks(23, 10, 3))
  assert.throws(() => decisionMakingMarks(23, 1.5, 0))
  assert.deepEqual([0,1,2,3,4,5].map(n => gridMarkValue('decision-making', ['Syllogisms'], n, 5)), [0,0,0,0,1,2])
  assert.equal(gridMarkValue('decision-making', [], 5, 5), 2)
  assert.equal(gridMarkValue('other', [], 4, 5), 0)
  assert.equal(gridMarkValue('decision-making', [], 0, 0), 0)
})

test('invalid, fractional cognitive and out-of-range values never produce a plausible score', () => {
  for (const raw of [NaN, Infinity, -1, 37, 0.5]) assert.throws(() => estimateCognitiveScore('quantitative-reasoning', raw))
  for (const maximum of [0, NaN, Infinity, -1, 36.5]) assert.throws(() => estimateCognitiveScore('quantitative-reasoning', 0, maximum))
  assert.throws(() => estimateSjtBand(69.5))
  assert.throws(() => estimateAnzSjtScore(10.25))
  assert.equal(estimateCognitiveScore('quantitative-reasoning', 10, 18), 600)
})

test('SJT half-credit thresholds, ANZ endpoints, rounding and monotonicity', () => {
  assert.equal(estimateSjtBand(34), 4)
  assert.equal(estimateSjtBand(34.5), 3)
  assert.equal(estimateSjtBand(44.5), 3)
  assert.equal(estimateSjtBand(45), 2)
  assert.equal(estimateSjtBand(55), 2)
  assert.equal(estimateSjtBand(55.5), 1)
  assert.equal(estimateAnzSjtScore(0), 300)
  assert.equal(estimateAnzSjtScore(34.5), 600)
  assert.equal(estimateAnzSjtScore(69), 900)
  assert.equal(estimateAnzSjtScore(45), 690)
  let previous = 300
  for (let raw = 0; raw <= 69; raw += 0.5) { const score = estimateAnzSjtScore(raw); assert(score >= previous && score <= 900); previous = score }
})

test('total requires exactly the cognitive scores and never adds SJT', () => {
  assert.equal(cognitiveTotal({ 'quantitative-reasoning': 750 }), null)
  const scores = { 'verbal-reasoning': 600, 'decision-making': 600, 'quantitative-reasoning': 600, 'situational-judgement': 900 }
  assert.equal(cognitiveTotal(scores), 1800)
  assert.throws(() => cognitiveTotal({ ...scores, 'decision-making': NaN }))
})

test('raw summary preserves partial credit and unanswered zero, but flags grading failures', () => {
  assert.deepEqual(summariseMarks([
    { maximum: 2, score: 1, answered: true, correct: false },
    { maximum: 1, score: 1, answered: true, correct: true },
    { maximum: 1, score: null, answered: false, correct: false },
  ]), { raw: 2, maximum: 4, correct: 1, total: 3, complete: true })
  assert.equal(summariseMarks([{ maximum: 1, score: null, answered: true, correct: false }]).complete, false)
  assert.equal(summariseMarks([{ maximum: 0, score: null, answered: false, correct: false }]).complete, false)
})

const identity: CalibrationIdentity = { formVersion: 'qr-01-content-key-v1', section: 'quantitative-reasoning', maximum: 36, timingProfile: 'standard-26-minutes' }
const cohort: CalibrationAttempt[] = Array.from({ length: 500 }, (_, i) => ({ ...identity, userId: `user-${i}`, raw: i % 2 ? 20 : 22, attemptNumber: 1, submitted: true, timed: true, preview: false, priorQuestionExposure: false, voided: false }))

test('calibration stays a draft until reviewed and only scores its exact form and timing', () => {
  const draft = buildCalibrationDraft(identity, 'cohort-v1', cohort)
  assert.equal(draft.mean, 21)
  assert.equal(draft.sampleSize, 500)
  assert.throws(() => scoreWithCalibration(21, identity, draft))
  const approved: CalibrationModel = { ...draft, status: 'approved', approvedAt: '2026-10-01', validationReportId: 'review-v1' }
  assert.equal(scoreWithCalibration(21, identity, approved), 600)
  assert.equal(scoreWithCalibration(0, identity, approved), 300)
  assert.equal(scoreWithCalibration(36, identity, approved), 900)
  assert.equal(scoreWithCalibration(33, identity, approved), 890)
  assert.equal(scoreWithCalibration(35, identity, approved), 890)
  const harderIdentity = { ...identity, qrTopScoreRaw: 35 as const }
  assert.throws(() => scoreWithCalibration(35, harderIdentity, approved))
  assert.equal(scoreWithCalibration(35, harderIdentity, { ...approved, qrTopScoreRaw: 35 }), 900)
  assert.throws(() => scoreWithCalibration(21, { ...identity, formVersion: 'changed-answers' }, approved))
  assert.throws(() => scoreWithCalibration(21, { ...identity, timingProfile: 'extra-time' }, approved))
  assert.throws(() => scoreWithCalibration(21, identity, { ...approved, standardDeviation: NaN }))
})

test('calibration rejects small samples, repeat/exposed/preview attempts, duplicates and no spread', () => {
  assert.throws(() => buildCalibrationDraft(identity, 'v1', cohort.slice(1)))
  for (const changes of [{ preview: true }, { priorQuestionExposure: true }, { voided: true }, { timed: false }, { submitted: false }, { attemptNumber: 2 }, { formVersion: 'different-form' }]) {
    assert.throws(() => buildCalibrationDraft(identity, 'v1', [{ ...cohort[0], ...changes }, ...cohort.slice(1)]))
  }
  assert.throws(() => buildCalibrationDraft(identity, 'v1', [...cohort, cohort[0]]))
  assert.throws(() => buildCalibrationDraft(identity, 'v1', cohort.map(a => ({ ...a, raw: 20 }))))
  assert.equal(buildCalibrationDraft(identity, 'v1', [{ ...cohort[0], raw: 0 }, ...cohort.slice(1)]).sampleSize, 500)
})
