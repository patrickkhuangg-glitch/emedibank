import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { QuestionTimeTracker, aggregateReview, groupedQuestionsFirst, reviewByType, reviewGroups, type ReviewItem } from '../src/lib/mock/review'

test('question timing accumulates repeat visits and excludes loading, marking and breaks', () => {
  const timer = new QuestionTimeTracker()
  timer.switchTo(null, 0)
  timer.switchTo('q1', 5000)
  timer.switchTo('q2', 15000)
  timer.switchTo('q1', 35000)
  assert.deepEqual(timer.snapshot(40000), { q1: 15, q2: 20 })
  assert.deepEqual(timer.snapshot(40000), { q1: 15, q2: 20 })
  timer.switchTo(null, 40000)
  assert.deepEqual(timer.snapshot(90000), { q1: 15, q2: 20 })
  timer.switchTo('q3', 90000)
  timer.switchTo(null, 97000)
  assert.deepEqual(timer.snapshot(100000), { q1: 15, q2: 20, q3: 7 })
})

test('QR ordering preserves complete groups before all standalone questions', () => {
  const input = [
    { id: 'solo1', stimulus_id: 'solo1' }, { id: 'a1', stimulus_id: 'a' },
    { id: 'a2', stimulus_id: 'a' }, { id: 'solo2', stimulus_id: null },
    { id: 'b1', stimulus_id: 'b' }, { id: 'a3', stimulus_id: 'a' },
    { id: 'b2', stimulus_id: 'b' }, { id: 'a4', stimulus_id: 'a' },
    { id: 'b3', stimulus_id: 'b' }, { id: 'b4', stimulus_id: 'b' },
  ]
  assert.deepEqual(groupedQuestionsFirst(input).map(q => q.id), ['a1','a2','a3','a4','b1','b2','b3','b4','solo1','solo2'])
  assert.deepEqual(groupedQuestionsFirst([]), [])
  assert.equal(input[0].id, 'solo1')
})

const items: ReviewItem[] = [60,40,20,0].map((seconds,i) => ({ id: `q${i}`, number: i+1, section: 'qr', sectionName: 'QR', setId: 'set1', setTitle: 'Set', questionType: i < 2 ? 'Rates' : 'Percentages', question: null, maximum: 1, score: i < 2 ? 1 : 0, seconds, status: i < 2 ? 'correct' : i === 2 ? 'incorrect' : 'unanswered' }))

test('set averages include all four questions and type analytics retain raw marks and timings', () => {
  const groups = reviewGroups(items)
  assert.equal(groups.length, 1)
  assert.equal(groups[0].averageSeconds, 30)
  assert.equal(groups[0].seconds, 120)
  assert.equal(groups[0].raw, 2)
  assert.deepEqual(reviewByType(items).map(t => [t.name,t.count,t.raw,t.maximum,t.averageSeconds]), [['Percentages',2,0,2,10],['Rates',2,2,2,50]])
  assert.equal(aggregateReview([...items, { ...items[0], score: null, status: 'unavailable' }]).complete, false)
})

test('same set ID in different sections is never pooled together', () => {
  const groups = reviewGroups([...items,{ ...items[0], id: 'other', section: 'dm' }])
  assert.equal(groups.length, 2)
  assert.equal(groups[0].count, 4)
  assert.equal(groups[1].count, 1)
})
