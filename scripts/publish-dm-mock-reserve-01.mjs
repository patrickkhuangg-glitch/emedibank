import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { clients, q, sql } from './lib/interview-operator.mjs'

const outputDirectory = '../output/ucat-dm-mock-reserve-01'
const bankSource = JSON.parse(readFileSync(`${outputDirectory}/question-bank.json`, 'utf8'))
const audit = JSON.parse(readFileSync(`${outputDirectory}/audit.json`, 'utf8'))
const selection = JSON.parse(readFileSync(`${outputDirectory}/reserve-selection.json`, 'utf8'))
const collection = bankSource.collection
const reserveBatch = 'STUDOCYTE-DM-MOCK-RESERVE-01'
const selected = [...selection.syllogisms, ...selection.recognisingAssumptions]

assert.equal(audit.status, 'passed_with_one_clarity_correction')
assert.equal(bankSource.mockOnly, true)
assert.equal(bankSource.questions.length, 6)
assert.equal(selected.length, 11)
assert.equal(selection.syllogisms.length, 6)
assert.equal(selection.recognisingAssumptions.length, 5)
assert.equal(new Set(selected.map((item) => item.id)).size, 11)

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
      .select('id,subtest_id,stimulus_id,kind,topic,stem,data,explanation_text,difficulty,sort_order,published,tags,options:question_options(id,label,body,is_correct,sort_order)')
      .eq('subtest_id', selection.subtestId)
      .order('sort_order')
      .range(start, start + 499))
    all.push(...page)
    if (page.length < 500) return all
  }
}

const before = await fetchBank()
const beforeById = new Map(before.map((question) => [question.id, question]))
const existing = before.filter((question) => question.data?.source_collection === collection)
for (const chosen of selected) {
  const question = beforeById.get(chosen.id)
  assert.ok(question, `Selected question disappeared: ${chosen.id}`)
  assert.equal(question.published, true)
  assert.notEqual(question.data?.mock_only, true)
}

const selectedIds = selected.map((item) => item.id)
const idList = selectedIds.map(q).join(',')
const references = await sql(`SELECT
  (SELECT count(*)::int FROM public.question_attempts WHERE question_id IN (${idList})) AS attempts,
  (SELECT count(*)::int FROM public.practice_sessions WHERE question_ids && ARRAY[${idList}]::uuid[]) AS practice_sessions,
  (SELECT count(*)::int FROM public.mock_question_assignments WHERE question_id IN (${idList})) AS mock_assignments`)
assert.deepEqual(references[0], { attempts: 0, practice_sessions: 0, mock_assignments: 0 }, 'Selected questions gained a reference after audit; rerun candidate selection')

let payload
if (existing.length) {
  assert.equal(existing.length, 6, 'Partial authored collection requires recovery')
  payload = JSON.parse(readFileSync(`${outputDirectory}/publication-manifest.json`, 'utf8'))
} else {
  const firstSortOrder = Math.max(0, ...before.map((question) => question.sort_order ?? 0)) + 1
  payload = { questions: [] }
  for (const [index, item] of bankSource.questions.entries()) {
    payload.questions.push({
      id: randomUUID(),
      subtest_id: selection.subtestId,
      stimulus_id: null,
      kind: 'single_best_answer',
      topic: bankSource.category,
      stem: item.stem,
      data: {
        source_id: `II-MOCK-01-Q${String(item.number).padStart(2, '0')}`,
        source_collection: collection,
        mock_only: true,
        mock_reserve_batch: reserveBatch,
        statements: item.statements,
      },
      explanation_text: item.explanation,
      difficulty: item.difficulty,
      sort_order: firstSortOrder + index,
      published: true,
      tags: [bankSource.category],
    })
  }
  writeFileSync(`${outputDirectory}/publication-manifest.json`, JSON.stringify(payload, null, 2) + '\n')

  const selectedUpdate = selectedIds.map((id) => ({ id }))
  const query = `DO $reserve$ BEGIN
    PERFORM pg_advisory_xact_lock(hashtext(${q(reserveBatch)}));
    IF EXISTS (SELECT 1 FROM public.questions WHERE data->>'source_collection' = ${q(collection)}) THEN
      RAISE EXCEPTION 'Authored collection appeared concurrently';
    END IF;
    IF (SELECT count(*) FROM public.questions WHERE id IN (${idList}) AND published AND coalesce(data->>'mock_only','false') <> 'true') <> 11 THEN
      RAISE EXCEPTION 'Reserve selection changed after audit';
    END IF;
    IF EXISTS (SELECT 1 FROM public.question_attempts WHERE question_id IN (${idList}))
      OR EXISTS (SELECT 1 FROM public.practice_sessions WHERE question_ids && ARRAY[${idList}]::uuid[])
      OR EXISTS (SELECT 1 FROM public.mock_question_assignments WHERE question_id IN (${idList})) THEN
      RAISE EXCEPTION 'A selected question gained a reference after audit';
    END IF;
    UPDATE public.questions AS questions
    SET data = coalesce(questions.data, '{}'::jsonb) || jsonb_build_object('mock_only', true, 'mock_reserve_batch', ${q(reserveBatch)})
    FROM jsonb_to_recordset(${q(JSON.stringify(selectedUpdate))}::jsonb) AS chosen(id uuid)
    WHERE questions.id = chosen.id;
    INSERT INTO public.questions (id,subtest_id,stimulus_id,kind,topic,stem,data,explanation_text,difficulty,sort_order,published,tags)
    SELECT id,subtest_id,stimulus_id,kind::public.question_kind,topic,stem,data,explanation_text,difficulty,sort_order,published,tags
    FROM jsonb_to_recordset(${q(JSON.stringify(payload.questions))}::jsonb)
      AS item(id uuid,subtest_id uuid,stimulus_id uuid,kind text,topic text,stem text,data jsonb,explanation_text text,difficulty text,sort_order integer,published boolean,tags text[]);
  END $reserve$;`
  await sql(query, false)
}

const after = await fetchBank()
const afterById = new Map(after.map((question) => [question.id, question]))
const authored = after.filter((question) => question.data?.source_collection === collection)
const reservedExisting = selected.map((item) => afterById.get(item.id))
assert.equal(after.length, before.length + (existing.length ? 0 : 6))
assert.equal(authored.length, 6)
assert.equal(reservedExisting.length, 11)

for (const expected of payload.questions) {
  const actual = afterById.get(expected.id)
  assert.ok(actual, `Missing ${expected.data.source_id}`)
  for (const key of ['subtest_id', 'stimulus_id', 'kind', 'topic', 'stem', 'data', 'explanation_text', 'difficulty', 'sort_order', 'published', 'tags']) {
    assert.deepEqual(actual[key], expected[key], `${expected.data.source_id}.${key}`)
  }
  assert.equal(actual.options.length, 0)
}

for (const item of selected) {
  const beforeQuestion = beforeById.get(item.id)
  const afterQuestion = afterById.get(item.id)
  assert.ok(afterQuestion)
  assert.equal(afterQuestion.data.mock_only, true)
  assert.equal(afterQuestion.data.mock_reserve_batch, reserveBatch)
  for (const key of ['id', 'subtest_id', 'stimulus_id', 'kind', 'topic', 'stem', 'explanation_text', 'difficulty', 'sort_order', 'published', 'tags', 'options']) {
    assert.deepEqual(afterQuestion[key], beforeQuestion[key], `${item.id}.${key}`)
  }
  const { mock_only: _oldMockOnly, mock_reserve_batch: _oldReserveBatch, ...beforeData } = beforeQuestion.data ?? {}
  const { mock_only: _newMockOnly, mock_reserve_batch: _newReserveBatch, ...afterData } = afterQuestion.data ?? {}
  assert.deepEqual(afterData, beforeData, `${item.id}.data`)
}

const practiceVisible = (question) => question.published && question.data?.mock_only !== true
const categoryCount = (questions, category) => questions.filter((question) => (question.topic === category || question.tags?.includes(category)) && practiceVisible(question)).length
const practiceCountsAfter = {
  syllogisms: categoryCount(after, 'Syllogisms'),
  recognisingAssumptions: categoryCount(after, 'Recognising Assumptions'),
  interpretingInformation: categoryCount(after, 'Interpreting Information'),
}
assert.deepEqual(practiceCountsAfter, { syllogisms: 54, recognisingAssumptions: 176, interpretingInformation: 0 })
assert.equal(after.filter((question) => question.data?.mock_reserve_batch === reserveBatch).length, 17)

const verification = {
  verifiedAt: new Date().toISOString(),
  reserveBatch,
  newInterpretingInformationQuestions: authored.length,
  reservedExistingSyllogisms: selection.syllogisms.length,
  reservedExistingRecognisingAssumptions: selection.recognisingAssumptions.length,
  totalMockOnlyReserve: 17,
  conclusions: authored.reduce((sum, question) => sum + question.data.statements.length, 0),
  practiceCountsBefore: selection.practiceCountsBefore,
  practiceCountsAfter,
  recordedReferencesBeforeReservation: references[0],
  allReservedQuestionsPublished: after.filter((question) => question.data?.mock_reserve_batch === reserveBatch).every((question) => question.published),
  existingQuestionContentPreserved: true,
  existingQuestionIdsPreserved: true,
  authoredContentMatchesAudit: true,
  mockAssignmentsCreated: 0,
  assignmentStatus: 'Held in the mock-only reserve pool for later placement in a specific mock form.',
  alreadyPresent: existing.length === 6,
}
writeFileSync(`${outputDirectory}/publication-verification.json`, JSON.stringify(verification, null, 2) + '\n')
console.log(JSON.stringify(verification))
