import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isStudyWorkspace } from '../src/lib/workspace/routes'

test('all active assessment routes retain their original shell', () => {
  for (const path of [
    '/session', '/exams/ucat/verbal-reasoning', '/exams/gamsat/humanities-and-social-sciences', '/exams/isat/critical-reasoning',
    '/mock/ucat/mock-1', '/mock/gamsat/mock-1', '/mock/isat/mock-1',
    '/mock/ucat/mini/verbal-reasoning/mini-1',
    '/essays/gamsat/written-communication/prompt-1', '/essays/gamsat/written-communication/random', '/essays/gamsat/written-communication/simulation',
    '/admin', '/admin/students', '/unrecognised-assessment',
  ]) assert.equal(isStudyWorkspace(path), false, path)
})

test('preparation and review routes use the redesigned workspace', () => {
  for (const path of [
    '/app','/dashboard','/dashboard/','/account','/bookings','/study-plan',
    '/practice/ucat','/practice/gamsat','/practice/isat', '/practice/ucat/verbal-reasoning','/practice/ucat/verbal-reasoning/start',
    '/practice/review/example-session', '/mock/ucat','/mock/ucat/mini/verbal-reasoning', '/exams/ucat', '/essays/gamsat/written-communication',
    '/interviews','/interviews/practice','/interviews/practice/session','/interviews/practice/recordings','/interviews/mock-interviews','/interviews/mock-interviews/session','/interviews/mock-interviews/review','/interviews/review','/interviews/stories','/interviews/resources','/interviews/focus-shop',
  ]) assert.equal(isStudyWorkspace(path), true, path)
})
