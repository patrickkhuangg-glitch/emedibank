import assert from 'node:assert/strict'
import { test } from 'node:test'
import { canMarkQuestions, questionViewProgress, recordQuestionView, type QuestionViews } from '../src/lib/practice/question-views'

const ids = ['first', 'middle', 'last']
const empty = (): QuestionViews => ({ sessionKey: '', viewedIds: [] })

test('jumping to the last question does not unlock marking', () => {
  let views = recordQuestionView(empty(), ids, 'first', true)
  views = recordQuestionView(views, ids, 'last', true)
  assert.deepEqual(questionViewProgress(views, ids), { allViewed: false, unviewedCount: 1, firstUnviewedIndex: 1 })
  assert.equal(canMarkQuestions(questionViewProgress(views, ids).allViewed), false)
  views = recordQuestionView(views, ids, 'middle', true)
  assert.equal(canMarkQuestions(questionViewProgress(views, ids).allViewed), true)
})

test('loading, intro, missing questions and repeat visits do not inflate the viewed count', () => {
  let views = recordQuestionView(empty(), ids, 'first', false)
  assert.equal(questionViewProgress(views, ids).unviewedCount, 3)
  views = recordQuestionView(views, ids, undefined, true)
  views = recordQuestionView(views, ids, 'outside-session', true)
  assert.equal(questionViewProgress(views, ids).unviewedCount, 3)
  views = recordQuestionView(views, ids, 'first', true)
  assert.equal(recordQuestionView(views, ids, 'first', true), views)
  assert.equal(questionViewProgress(views, ids).unviewedCount, 2)
})

test('a new session or mock section starts with its own viewing requirement', () => {
  let views = empty()
  for (const id of ids) views = recordQuestionView(views, ids, id, true)
  const next = ['next-first', 'next-last']
  views = recordQuestionView(views, next, next[0], true)
  assert.deepEqual(questionViewProgress(views, next), { allViewed: false, unviewedCount: 1, firstUnviewedIndex: 1 })
  assert.equal(questionViewProgress(empty(), []).allViewed, false)
})

test('timer expiry can submit even when manual marking is locked', () => {
  assert.equal(canMarkQuestions(false), false)
  assert.equal(canMarkQuestions(false, 'timer'), true)
  assert.equal(canMarkQuestions(true), true)
})
