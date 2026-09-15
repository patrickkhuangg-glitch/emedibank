import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { clients, q, sql } from './lib/interview-operator.mjs'

const outputDirectory = '../output/ucat-dm-logical-puzzles-01'
const bankSource = JSON.parse(readFileSync(`${outputDirectory}/question-bank.json`, 'utf8'))
const audit = JSON.parse(readFileSync(`${outputDirectory}/audit.json`, 'utf8'))
const collection = bankSource.collection
const category = bankSource.category
const reserveBatch = 'STUDOCYTE-DM-LOGICAL-PUZZLES-MOCK-RESERVE-01'

assert.equal(audit.status, 'passed_with_source_cleanup')
assert.equal(bankSource.questions.length, 60)
assert.equal(audit.options, 240)
assert.equal(audit.answers, 60)
assert.equal(audit.rationales, 60)
assert.deepEqual(audit.answerBalance, { A: 15, B: 15, C: 15, D: 15 })
assert.deepEqual(audit.reserveDifficultyMix, { easy: 2, medium: 2, hard: 2 })
assert.equal(bankSource.questions.filter((question) => question.mockOnly).length, 6)

const { admin } = await clients()
async function get(query) {
  const { data, error } = await query
  if (error) throw error
  return data
}

const exam = await get(admin.from('exams').select('id').eq('name', 'UCAT').single())
const subtest = await get(admin.from('subtests').select('id').eq('exam_id', exam.id).eq('name', 'Decision Making').single())

async function fetchBank() {
  const all = []
  for (let start = 0; ; start += 500) {
    const page = await get(admin.from('questions')
      .select('id,subtest_id,stimulus_id,kind,topic,stem,data,explanation_text,difficulty,sort_order,published,tags,options:question_options(id,question_id,label,body,is_correct,sort_order)')
      .eq('subtest_id', subtest.id)
      .order('sort_order')
      .range(start, start + 499))
    all.push(...page)
    if (page.length < 500) return all
  }
}

const normalize = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const tokenSet = (value) => new Set(normalize(value).split(' ').filter((token) => token.length > 2))
const jaccard = (left, right) => {
  const a = tokenSet(left)
  const b = tokenSet(right)
  const shared = [...a].filter((token) => b.has(token)).length
  return shared / new Set([...a, ...b]).size
}
const practiceVisible = (question) => question.published && question.data?.mock_only !== true
const tagged = (question, value) => question.topic === value || question.tags?.includes(value)
const normalizeQuestion = (question) => ({
  ...question,
  options: [...question.options].sort((left, right) => left.id.localeCompare(right.id)),
})

const before = await fetchBank()
const existing = before.filter((question) => question.data?.source_collection === collection)
const exactLiveOverlaps = []
const nearLiveOverlaps = []
if (!existing.length) {
  for (const authored of bankSource.questions) {
    for (const live of before) {
      if (normalize(authored.stem) === normalize(live.stem)) exactLiveOverlaps.push({ authored: authored.number, live: live.id })
      const similarity = jaccard(authored.stem, live.stem)
      if (similarity >= 0.72) nearLiveOverlaps.push({ authored: authored.number, live: live.id, similarity })
    }
  }
  assert.equal(exactLiveOverlaps.length, 0, 'An authored stem already exists in the live bank')
  assert.equal(nearLiveOverlaps.length, 0, 'An authored stem substantially overlaps the live bank')
}

const practiceLogicBefore = before.filter((question) => tagged(question, category) && practiceVisible(question)).length
assert.equal(practiceLogicBefore, existing.length ? 54 : 0, 'Unexpected pre-existing Logic Puzzles practice count')

let payload
if (existing.length) {
  assert.equal(existing.length, 60, 'A partial existing collection requires recovery')
  payload = JSON.parse(readFileSync(`${outputDirectory}/publication-manifest.json`, 'utf8'))
} else {
  const firstSortOrder = Math.max(0, ...before.map((question) => question.sort_order ?? 0)) + 1
  payload = { questions: [], options: [] }
  for (const [index, item] of bankSource.questions.entries()) {
    const questionId = randomUUID()
    const data = {
      source_id: `LP01-Q${String(item.number).padStart(2, '0')}`,
      source_collection: collection,
      subflavour: item.subflavour,
      outcomes: item.outcomes,
      ...(item.mockOnly ? { mock_only: true, mock_reserve_batch: reserveBatch } : {}),
    }
    payload.questions.push({
      id: questionId,
      subtest_id: subtest.id,
      stimulus_id: null,
      kind: 'single_best_answer',
      topic: category,
      stem: item.stem,
      data,
      explanation_text: item.explanation,
      difficulty: item.difficulty,
      sort_order: firstSortOrder + index,
      published: true,
      tags: [category],
    })
    for (const [optionIndex, option] of item.options.entries()) {
      payload.options.push({
        id: randomUUID(),
        question_id: questionId,
        label: option.label,
        body: option.body,
        is_correct: option.label === item.correct,
        sort_order: optionIndex + 1,
      })
    }
  }
  assert.equal(payload.questions.length, 60)
  assert.equal(payload.options.length, 240)
  writeFileSync(`${outputDirectory}/publication-manifest.json`, JSON.stringify(payload, null, 2) + '\n')

  const query = `DO $import$ BEGIN
    PERFORM pg_advisory_xact_lock(hashtext(${q(collection)}));
    IF EXISTS (SELECT 1 FROM public.questions WHERE data->>'source_collection' = ${q(collection)}) THEN
      RAISE EXCEPTION 'Collection appeared concurrently';
    END IF;
    INSERT INTO public.questions (id,subtest_id,stimulus_id,kind,topic,stem,data,explanation_text,difficulty,sort_order,published,tags)
    SELECT id,subtest_id,stimulus_id,kind::public.question_kind,topic,stem,data,explanation_text,difficulty,sort_order,published,tags
    FROM jsonb_to_recordset(${q(JSON.stringify(payload.questions))}::jsonb)
      AS item(id uuid,subtest_id uuid,stimulus_id uuid,kind text,topic text,stem text,data jsonb,explanation_text text,difficulty text,sort_order integer,published boolean,tags text[]);
    INSERT INTO public.question_options (id,question_id,label,body,is_correct,sort_order)
    SELECT id,question_id,label,body,is_correct,sort_order
    FROM jsonb_to_recordset(${q(JSON.stringify(payload.options))}::jsonb)
      AS option(id uuid,question_id uuid,label text,body text,is_correct boolean,sort_order integer);
  END $import$;`
  await sql(query, false)
}

const after = await fetchBank()
const afterById = new Map(after.map((question) => [question.id, question]))
const published = after.filter((question) => question.data?.source_collection === collection)
assert.equal(after.length, before.length + (existing.length ? 0 : 60))
assert.equal(published.length, 60)
for (const oldQuestion of before) {
  assert.deepEqual(normalizeQuestion(afterById.get(oldQuestion.id)), normalizeQuestion(oldQuestion), `Existing question changed: ${oldQuestion.id}`)
}
for (const expected of payload.questions) {
  const actual = afterById.get(expected.id)
  assert.ok(actual, `Missing ${expected.data.source_id}`)
  for (const key of ['subtest_id', 'stimulus_id', 'kind', 'topic', 'stem', 'data', 'explanation_text', 'difficulty', 'sort_order', 'published', 'tags']) {
    assert.deepEqual(actual[key], expected[key], `${expected.data.source_id}.${key}`)
  }
  const expectedOptions = payload.options.filter((option) => option.question_id === expected.id)
  assert.equal(actual.options.length, 4)
  assert.equal(actual.options.filter((option) => option.is_correct).length, 1)
  for (const expectedOption of expectedOptions) {
    const actualOption = actual.options.find((option) => option.id === expectedOption.id)
    assert.ok(actualOption, `Missing ${expected.data.source_id}.${expectedOption.label}`)
    for (const key of ['question_id', 'label', 'body', 'is_correct', 'sort_order']) assert.deepEqual(actualOption[key], expectedOption[key])
  }
}

const practiceLogicAfter = after.filter((question) => tagged(question, category) && practiceVisible(question)).length
const reserved = published.filter((question) => question.data?.mock_only === true && question.data?.mock_reserve_batch === reserveBatch)
assert.equal(practiceLogicAfter, 54)
assert.equal(reserved.length, 6)
assert.deepEqual(reserved.reduce((counts, question) => {
  counts[question.difficulty] += 1
  return counts
}, { easy: 0, medium: 0, hard: 0 }), { easy: 2, medium: 2, hard: 2 })

const verification = {
  verifiedAt: new Date().toISOString(),
  collection,
  category,
  publishedQuestions: published.length,
  publishedOptions: published.reduce((sum, question) => sum + question.options.length, 0),
  explanations: published.filter((question) => question.explanation_text).length,
  practiceQuestions: practiceLogicAfter,
  mockOnlyReserveQuestions: reserved.length,
  reserveBatch,
  reserveQuestionNumbers: audit.reserveQuestions,
  reserveDifficultyMix: audit.reserveDifficultyMix,
  exactLiveOverlaps: exactLiveOverlaps.length,
  nearLiveOverlaps: nearLiveOverlaps.length,
  existingQuestionBankPreserved: true,
  mockAssignmentsCreated: 0,
  assignmentStatus: 'Held in the mock-only reserve pool for later placement in a full mock form.',
  publishedDuringThisTask: true,
  verificationMode: existing.length === 60 ? 'Idempotent readback after the initial insert.' : 'Initial publication readback.',
}
writeFileSync(`${outputDirectory}/publication-verification.json`, JSON.stringify(verification, null, 2) + '\n')
console.log(JSON.stringify(verification))
