import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { loadModule } from './helpers/load-module.mjs'

test('authenticated grading path returns earned DM partial marks and records fully-correct separately', async () => {
  const inserted = []
  const marks = loadModule('src/lib/practice/marks.ts')
  const questions = loadModule('src/lib/access/questions.ts', {
    '@/lib/practice/marks': marks,
    '@/lib/mock/qr-question-types.json': {},
    '@/lib/questions/availability': loadModule('src/lib/questions/availability.ts'),
    '@/lib/supabase/admin': { createAdminClient: () => ({ from: () => ({ insert: async row => { inserted.push(row); return { error: null } } }) }) },
    '@/lib/access': { canAccessExam: async () => true, hasActiveEntitlement: async () => true },
  })
  const meta = { id: 'q1', subtest_id: 'dm', subtest_slug: 'decision-making', exam_id: 'ucat', tags: [], data: { statements: Array.from({ length: 5 }, () => ({ text: 'Statement', correct: 'Yes' })) }, explanation_text: 'Rationale', video_status: 'none' }
  for (let correct = 0; correct <= 5; correct++) {
    const answers = Object.fromEntries(Array.from({ length: 5 }, (_, i) => [String(i), i < correct ? 'Yes' : 'No']))
    const result = await questions.gradeGrid('student', meta, answers)
    assert.equal(result.score, correct === 5 ? 2 : correct === 4 ? 1 : 0)
    assert.equal(result.is_correct, correct === 5)
  }
  assert.equal(inserted[4].is_correct, false)
  assert.equal(inserted[5].is_correct, true)
})
