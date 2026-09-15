import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { clients, q, sql } from './lib/interview-operator.mjs'

const outputDirectory = '../output/ucat-dm-mock-reserve-01'
const authored = JSON.parse(readFileSync(`${outputDirectory}/question-bank.json`, 'utf8'))
const { admin } = await clients()

async function get(query) {
  const { data, error } = await query
  if (error) throw error
  return data
}

const exam = await get(admin.from('exams').select('id').eq('name', 'UCAT').single())
const subtest = await get(admin.from('subtests').select('id').eq('exam_id', exam.id).eq('name', 'Decision Making').single())
const bank = []
for (let start = 0; ; start += 500) {
  const page = await get(admin.from('questions')
    .select('id,stem,topic,tags,data,difficulty,published,sort_order')
    .eq('subtest_id', subtest.id)
    .order('sort_order')
    .range(start, start + 499))
  bank.push(...page)
  if (page.length < 500) break
}

const normalize = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const tokens = (value) => new Set(normalize(value).split(' ').filter((token) => token.length > 2))
const jaccard = (left, right) => {
  const a = tokens(left)
  const b = tokens(right)
  const shared = [...a].filter((token) => b.has(token)).length
  return shared / new Set([...a, ...b]).size
}

const exactLiveOverlaps = []
const nearLiveOverlaps = []
for (const question of authored.questions) {
  for (const existing of bank) {
    if (normalize(question.stem) === normalize(existing.stem)) exactLiveOverlaps.push({ question: question.number, existingId: existing.id })
    const similarity = jaccard(question.stem, existing.stem)
    if (similarity >= 0.72) nearLiveOverlaps.push({ question: question.number, existingId: existing.id, similarity })
  }
}
assert.equal(exactLiveOverlaps.length, 0, 'An authored stem already exists in the live bank')
assert.equal(nearLiveOverlaps.length, 0, 'An authored stem substantially overlaps the live bank')

const usage = await sql(`
  SELECT q.id,
         (SELECT count(*)::int FROM public.question_attempts a WHERE a.question_id = q.id) AS attempts,
         (SELECT count(*)::int FROM public.practice_sessions p WHERE p.question_ids @> ARRAY[q.id]::uuid[]) AS practice_sessions,
         (SELECT count(*)::int FROM public.mock_question_assignments m WHERE m.question_id = q.id) AS mock_assignments
  FROM public.questions q
  WHERE q.subtest_id = ${q(subtest.id)}::uuid
    AND (q.topic = 'Recognising Assumptions' OR q.tags @> ARRAY['Syllogisms']::text[])
`)
const usageById = new Map(usage.map((row) => [row.id, row]))

const eligible = (category) => bank
  .filter((question) => question.topic === category || question.tags?.includes(category))
  .filter((question) => question.published && question.data?.mock_only !== true)
  .sort((left, right) => {
    const leftMocks = usageById.get(left.id)?.mock_assignments ?? 0
    const rightMocks = usageById.get(right.id)?.mock_assignments ?? 0
    if (leftMocks !== rightMocks) return rightMocks - leftMocks
    const leftAttempts = usageById.get(left.id)?.attempts ?? 0
    const rightAttempts = usageById.get(right.id)?.attempts ?? 0
    if (leftAttempts !== rightAttempts) return leftAttempts - rightAttempts
    const leftSessions = usageById.get(left.id)?.practice_sessions ?? 0
    const rightSessions = usageById.get(right.id)?.practice_sessions ?? 0
    return leftSessions - rightSessions || (right.sort_order ?? 0) - (left.sort_order ?? 0)
  })

function pick(category, targets) {
  const pool = eligible(category)
  const picked = []
  for (const [difficulty, count] of Object.entries(targets)) {
    const matches = pool.filter((question) => question.difficulty === difficulty && !picked.includes(question)).slice(0, count)
    assert.equal(matches.length, count, `Not enough unused ${difficulty} ${category} questions`)
    picked.push(...matches)
  }
  return picked.map((question) => ({
    id: question.id,
    category,
    difficulty: question.difficulty,
    sortOrder: question.sort_order,
    sourceCollection: question.data?.source_collection ?? null,
    sourceId: question.data?.source_id ?? null,
    recordedAttempts: usageById.get(question.id)?.attempts ?? 0,
    priorPracticeSessions: usageById.get(question.id)?.practice_sessions ?? 0,
    existingMockAssignments: usageById.get(question.id)?.mock_assignments ?? 0,
    stem: question.stem,
  }))
}

const syllogisms = pick('Syllogisms', { easy: 2, medium: 2, hard: 2 })
const recognisingAssumptions = pick('Recognising Assumptions', { easy: 2, medium: 2, hard: 1 })
assert.equal(new Set([...syllogisms, ...recognisingAssumptions].map((question) => question.id)).size, 11)

const selection = {
  auditedAt: new Date().toISOString(),
  subtestId: subtest.id,
  authored: {
    questions: authored.questions.length,
    exactLiveOverlaps,
    nearLiveOverlaps,
  },
  practiceCountsBefore: {
    syllogisms: bank.filter((question) => question.tags?.includes('Syllogisms') && question.published && question.data?.mock_only !== true).length,
    recognisingAssumptions: bank.filter((question) => question.topic === 'Recognising Assumptions' && question.published && question.data?.mock_only !== true).length,
    interpretingInformation: bank.filter((question) => question.topic === 'Interpreting Information' && question.published && question.data?.mock_only !== true).length,
  },
  eligibilityRule: 'published and currently practice-visible; prefer questions already assigned to mocks, then the fewest recorded answers and generated practice sessions',
  syllogisms,
  recognisingAssumptions,
}
writeFileSync(`${outputDirectory}/reserve-selection.json`, JSON.stringify(selection, null, 2) + '\n')
console.log(JSON.stringify({
  authoredQuestions: authored.questions.length,
  exactLiveOverlaps: exactLiveOverlaps.length,
  nearLiveOverlaps: nearLiveOverlaps.length,
  practiceCountsBefore: selection.practiceCountsBefore,
  selectedSyllogisms: syllogisms.length,
  selectedRecognisingAssumptions: recognisingAssumptions.length,
}))
