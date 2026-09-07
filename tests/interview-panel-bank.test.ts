import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { INTERVIEW_STATIONS } from '../src/lib/interviews/stations'
import { makeMockSteps, mockView, mockOptions } from '../src/lib/interviews/mock-plan'
import { getInterviewQuestions, getPracticeQuestionIndex } from '../src/lib/interviews/timing'
import type { MockTicket } from '../src/lib/interviews/mock-types'

const panel = INTERVIEW_STATIONS.filter(station => station.format === 'panel')

test('panel bank matches all 32 themes and 160 questions extracted from the supplied Word document', () => {
 assert.deepEqual(panel.map(s => s.panelThemeNumber), Array.from({length:32}, (_, i) => i + 1))
 assert.equal(new Set(panel.map(s => s.id)).size, 32)
 assert.ok(panel.every(s => s.questions.length === 5 && new Set(s.questions).size === 5))
 const bank = panel.map(s => ({number:s.panelThemeNumber,title:s.title,questions:s.questions,preparation:s.preparation}))
 const normalised = JSON.stringify(bank).replaceAll('’', "'").replace(/[—–]/g, '-')
 // Derived independently from EMeducate_Panel_Interview_Question_Bank.docx, not the code bank.
 assert.equal(createHash('sha256').update(normalised).digest('hex'), '41e8f6b8ffe4d69869b0595c59a9eef03117ac08df8d98df081631c474851194')
 assert.equal(mockOptions().filter(option => option.format === 'panel').length, 160)
 assert.deepEqual(panel.slice(0, 4).map(s => s.id), ['panel-motivation','panel-service','panel-resilience','panel-teamwork'])
})

test('full panels always open with motivation and balance five paired themes over exactly 30 minutes', () => {
 const seen = new Set<string>()
 const bankBefore = JSON.stringify(INTERVIEW_STATIONS)
 for (let seed = 1; seed <= 1000; seed++) {
  let state = seed
  const random = () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return state / 4294967296 }
  const steps = makeMockSteps({format:'panel',mode:'full'}, random)
  assert.equal(steps.length, 10)
  assert.equal(steps[0].stationId, 'panel-motivation')
  assert.equal(steps[1].stationId, 'panel-motivation')
  const numbers = []
  for (let i = 0; i < 10; i += 2) {
   assert.equal(steps[i].stationId, steps[i + 1].stationId)
   assert.notEqual(steps[i].questionIndex, steps[i + 1].questionIndex)
   numbers.push(panel.find(s => s.id === steps[i].stationId)!.panelThemeNumber!)
  }
  assert.equal(new Set(numbers).size, 5)
  assert.equal(numbers.filter(n => n >= 2 && n <= 14).length, 2)
  assert.equal(numbers.filter(n => n >= 15 && n <= 32).length, 2)
  assert.equal(steps.reduce((total, step) => total + step.preparationSeconds + step.responseSeconds, 0), 1800)
  const ticket:MockTicket = {version:1,id:'test',userId:'test',startedAt:1000,format:'panel',mode:'full',steps}
  for (let i = 0; i < steps.length; i++) {
   const step = steps[i], station = panel.find(s => s.id === step.stationId)!
   assert.equal(step.preparationSeconds, 0);assert.equal(step.responseSeconds, 180)
   seen.add(`${step.stationId}:${step.questionIndex}`)
   const view = mockView(ticket, 1000 + i * 180000)
   assert.equal(view.index, i)
   assert.deepEqual(view.questions, [station.questions[step.questionIndex]])
   assert.ok(!('steps' in view))
  }
  assert.equal(mockView(ticket, 1801000).phase, 'complete')
 }
 assert.equal(seen.size, 160, 'Every question remains reachable across balanced mocks')
 assert.equal(JSON.stringify(INTERVIEW_STATIONS), bankBefore, 'Selection must not reorder the source bank')
})

test('individual practice accepts every panel question and preserves old links while rejecting invalid selections', () => {
 for (const station of panel) {
  assert.equal(getPracticeQuestionIndex(station, undefined), 0)
  for (let index = 0; index < 5; index++) {
   assert.equal(getPracticeQuestionIndex(station, String(index)), index)
   assert.equal(getPracticeQuestionIndex(station, index), index)
   assert.deepEqual(getInterviewQuestions(station, index), [station.questions[index]])
  }
  for (const invalid of [-1, 5, 1.5, '', '1x', null, {}, ['2'], Infinity]) assert.equal(getPracticeQuestionIndex(station, invalid), null)
 }
 const mmi = INTERVIEW_STATIONS.find(s => s.format === 'mmi')!
 assert.deepEqual(getInterviewQuestions(mmi), mmi.questions)
})
