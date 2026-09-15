import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { clients, q, sql } from './lib/interview-operator.mjs'

const outputDirectory = '../output/ucat-dm-three-bank-import-01'
const audit = JSON.parse(readFileSync(`${outputDirectory}/audit.json`, 'utf8'))
const overlap = JSON.parse(readFileSync(`${outputDirectory}/live-overlap-audit.json`, 'utf8'))
const plan = JSON.parse(readFileSync(`${outputDirectory}/publish-plan.json`, 'utf8'))
const batch = 'STUDOCYTE-DM-THREE-BANK-IMPORT-01'

assert.equal(audit.status, 'passed_pending_live_overlap_check')
assert.equal(overlap.status, 'passed')
assert.equal(overlap.totalSourceQuestions, 305)
assert.equal(overlap.existingExactMatchesPreserved, 67)
assert.equal(overlap.totalUniqueToPublish, 238)
assert.equal(plan.banks.logicalPuzzles.questions.length, 61)
assert.equal(plan.banks.syllogisms.questions.length, 120)
assert.equal(plan.banks.interpretingInformation.questions.length, 57)

const { admin } = await clients()
async function get(query) {
  const { data, error } = await query
  if (error) throw error
  return data
}
async function fetchBank() {
  const all = []
  for (let start = 0; ; start += 500) {
    const page = await get(admin.from('questions')
      .select('id,subtest_id,stimulus_id,kind,topic,stem,data,explanation_text,difficulty,sort_order,published,tags,options:question_options(id,question_id,label,body,is_correct,sort_order)')
      .eq('subtest_id', plan.subtestId)
      .order('sort_order')
      .range(start, start + 499))
    all.push(...page)
    if (page.length < 500) return all
  }
}
const normalizeQuestion = (question) => ({ ...question, options: [...question.options].sort((left, right) => left.id.localeCompare(right.id)) })
const practiceVisible = (question) => question.published && question.data?.mock_only !== true
const tagged = (question, category) => question.topic === category || question.tags?.includes(category)

const before = await fetchBank()
const expectedCounts = {
  [plan.banks.logicalPuzzles.collection]: 61,
  [plan.banks.syllogisms.collection]: 120,
  [plan.banks.interpretingInformation.collection]: 57,
}
const existingByCollection = Object.fromEntries(Object.keys(expectedCounts).map((collection) => [collection, before.filter((question) => question.data?.source_collection === collection)]))
const existingTotal = Object.values(existingByCollection).reduce((sum, questions) => sum + questions.length, 0)
assert.ok(existingTotal === 0 || existingTotal === 238, 'A partial prior import requires recovery')
for (const [collection, count] of Object.entries(expectedCounts)) {
  assert.equal(existingByCollection[collection].length, existingTotal ? count : 0, `${collection} count mismatch`)
}

const practiceBefore = {
  logicalPuzzles: before.filter((question) => tagged(question, 'Logic Puzzles') && practiceVisible(question)).length,
  syllogisms: before.filter((question) => tagged(question, 'Syllogisms') && practiceVisible(question)).length,
  interpretingInformation: before.filter((question) => tagged(question, 'Interpreting Information') && practiceVisible(question)).length,
}
assert.deepEqual(practiceBefore, existingTotal ? { logicalPuzzles: 115, syllogisms: 174, interpretingInformation: 57 } : { logicalPuzzles: 54, syllogisms: 54, interpretingInformation: 0 })

let payload
if (existingTotal) {
  payload = JSON.parse(readFileSync(`${outputDirectory}/publication-manifest.json`, 'utf8'))
} else {
  payload = { questions: [], options: [] }
  let sortOrder = Math.max(0, ...before.map((question) => question.sort_order ?? 0)) + 1

  for (const item of plan.banks.logicalPuzzles.questions) {
    const questionId = randomUUID()
    payload.questions.push({
      id: questionId, subtest_id: plan.subtestId, stimulus_id: null, kind: 'single_best_answer', topic: 'Logic Puzzles', stem: item.stem,
      data: { source_id: `LP02-Q${String(item.number).padStart(3, '0')}`, source_collection: plan.banks.logicalPuzzles.collection, import_batch: batch, subflavour: item.subflavour, outcomes: item.outcomes },
      explanation_text: item.explanation, difficulty: item.difficulty, sort_order: sortOrder++, published: true, tags: ['Logic Puzzles'],
    })
    for (const [optionIndex, option] of item.options.entries()) {
      payload.options.push({ id: randomUUID(), question_id: questionId, label: option.label, body: option.body, is_correct: option.label === item.correct, sort_order: optionIndex + 1 })
    }
  }
  for (const item of plan.banks.syllogisms.questions) {
    payload.questions.push({
      id: randomUUID(), subtest_id: plan.subtestId, stimulus_id: null, kind: 'single_best_answer', topic: 'Syllogisms', stem: item.stem,
      data: { source_id: `SYL02-${item.sourceId}`, source_collection: plan.banks.syllogisms.collection, import_batch: batch, statements: item.statements },
      explanation_text: item.explanation, difficulty: item.difficulty, sort_order: sortOrder++, published: true, tags: ['Syllogisms'],
    })
  }
  for (const item of plan.banks.interpretingInformation.questions) {
    payload.questions.push({
      id: randomUUID(), subtest_id: plan.subtestId, stimulus_id: null, kind: 'single_best_answer', topic: 'Interpreting Information', stem: item.stem,
      data: { source_id: `II02-U${String(item.number).padStart(2, '0')}`, source_collection: plan.banks.interpretingInformation.collection, import_batch: batch, title: item.title, statements: item.statements },
      explanation_text: item.explanation, difficulty: item.difficulty, sort_order: sortOrder++, published: true, tags: ['Interpreting Information'],
    })
  }
  assert.equal(payload.questions.length, 238)
  assert.equal(payload.options.length, 244)
  writeFileSync(`${outputDirectory}/publication-manifest.json`, JSON.stringify(payload, null, 2) + '\n')

  const query = `DO $import$ BEGIN
    PERFORM pg_advisory_xact_lock(hashtext(${q(batch)}));
    IF EXISTS (SELECT 1 FROM public.questions WHERE data->>'source_collection' = ANY(ARRAY[${Object.keys(expectedCounts).map(q).join(',')}])) THEN
      RAISE EXCEPTION 'One of the destination collections appeared concurrently';
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
assert.equal(after.length, before.length + (existingTotal ? 0 : 238))
for (const oldQuestion of before) assert.deepEqual(normalizeQuestion(afterById.get(oldQuestion.id)), normalizeQuestion(oldQuestion), `Existing question changed: ${oldQuestion.id}`)
for (const expected of payload.questions) {
  const actual = afterById.get(expected.id)
  assert.ok(actual, `Missing ${expected.data.source_id}`)
  for (const key of ['subtest_id', 'stimulus_id', 'kind', 'topic', 'stem', 'data', 'explanation_text', 'difficulty', 'sort_order', 'published', 'tags']) assert.deepEqual(actual[key], expected[key], `${expected.data.source_id}.${key}`)
  const expectedOptions = payload.options.filter((option) => option.question_id === expected.id)
  assert.equal(actual.options.length, expectedOptions.length)
  for (const option of expectedOptions) {
    const stored = actual.options.find((candidate) => candidate.id === option.id)
    assert.ok(stored, `Missing option ${option.id}`)
    for (const key of ['question_id', 'label', 'body', 'is_correct', 'sort_order']) assert.deepEqual(stored[key], option[key])
  }
  if (expected.data.statements) assert.equal(expected.data.statements.length, 5)
}

const imported = after.filter((question) => question.data?.import_batch === batch)
assert.equal(imported.length, 238)
const practiceAfter = {
  logicalPuzzles: after.filter((question) => tagged(question, 'Logic Puzzles') && practiceVisible(question)).length,
  syllogisms: after.filter((question) => tagged(question, 'Syllogisms') && practiceVisible(question)).length,
  interpretingInformation: after.filter((question) => tagged(question, 'Interpreting Information') && practiceVisible(question)).length,
}
assert.deepEqual(practiceAfter, { logicalPuzzles: 115, syllogisms: 174, interpretingInformation: 57 })

const verification = {
  verifiedAt: new Date().toISOString(),
  batch,
  sourceQuestionsAudited: 305,
  existingEquivalentQuestionsPreserved: 67,
  newQuestionsPublished: imported.length,
  newOptionsPublished: imported.reduce((sum, question) => sum + question.options.length, 0),
  newExplanationsPublished: imported.filter((question) => question.explanation_text).length,
  publishedByCategory: {
    logicalPuzzles: imported.filter((question) => tagged(question, 'Logic Puzzles')).length,
    syllogisms: imported.filter((question) => tagged(question, 'Syllogisms')).length,
    interpretingInformation: imported.filter((question) => tagged(question, 'Interpreting Information')).length,
  },
  practiceCountsBefore: practiceBefore,
  practiceCountsAfter: practiceAfter,
  allSourceQuestionsRepresentedAfterDeduplication: imported.length + overlap.existingExactMatchesPreserved === overlap.totalSourceQuestions,
  existingQuestionBankPreserved: true,
  newQuestionsPracticeVisible: imported.every(practiceVisible),
  publishedDuringThisTask: true,
  verificationMode: existingTotal ? 'Idempotent readback after the initial insert.' : 'Initial publication readback.',
}
assert.equal(verification.allSourceQuestionsRepresentedAfterDeduplication, true)
assert.equal(verification.newQuestionsPracticeVisible, true)
writeFileSync(`${outputDirectory}/publication-verification.json`, JSON.stringify(verification, null, 2) + '\n')
console.log(JSON.stringify(verification))
