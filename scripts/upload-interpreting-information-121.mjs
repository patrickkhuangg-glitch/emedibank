import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { clients, q, sql } from './lib/interview-operator.mjs'

const sourceDir = '../output/ucat-dm-interpreting-information-02'
const bankSource = JSON.parse(readFileSync(`${sourceDir}/question-bank.json`, 'utf8'))
const audit = JSON.parse(readFileSync(`${sourceDir}/audit.json`, 'utf8'))
const collection = bankSource.collection
const category = 'Recognising Assumptions'
const questions = bankSource.questions

assert.equal(audit.status, 'passed')
assert.equal(questions.length, 121)
assert.equal(audit.answers, 121)
assert.deepEqual(audit.range, [61, 181])
assert.deepEqual(audit.optionsPerQuestion, [4])
assert.deepEqual(audit.answerBalance, { A: 31, B: 31, C: 31, D: 28 })
assert.equal(audit.structuralErrors.length, 0)
assert.equal(audit.exactPromptDuplicatesWithinSet.length, 0)
assert.equal(audit.exactPromptDuplicatesWithSet1.length, 0)

const { admin } = await clients()
const { data: exams, error: examError } = await admin.from('exams').select('id,name').eq('name', 'UCAT')
if (examError) throw examError
assert.equal(exams?.length, 1, 'Expected one UCAT exam')
const { data: subtests, error: subtestError } = await admin.from('subtests').select('id,name').eq('exam_id', exams[0].id).eq('name', 'Decision Making')
if (subtestError) throw subtestError
assert.equal(subtests?.length, 1, 'Expected one UCAT Decision Making subtest')
const subtestId = subtests[0].id

async function fetchBank() {
  const all = []
  for (let start = 0; ; start += 500) {
    const { data, error } = await admin
      .from('questions')
      .select('id,stem,explanation_text,published,tags,topic,difficulty,sort_order,data,options:question_options(id,label,body,is_correct,sort_order)')
      .eq('subtest_id', subtestId)
      .order('sort_order')
      .range(start, start + 499)
    if (error) throw error
    all.push(...data)
    if (data.length < 500) return all
  }
}

const before = await fetchBank()
const existing = before.filter((question) => question.data?.source_collection === collection)
console.log(JSON.stringify({ stage: 'preflight', decisionMakingQuestions: before.length, recognisingAssumptionsQuestions: before.filter((question) => question.tags?.includes(category)).length, existingCollection: existing.length }))

let payload
if (existing.length) {
  assert.equal(existing.length, 121, 'A partial existing collection requires manual audit')
  payload = JSON.parse(readFileSync(`${sourceDir}/publication-manifest.json`, 'utf8'))
} else {
  for (const item of questions) {
    const stem = `${item.prompt}\n\nSelect the strongest argument from the statements below.`
    assert.ok(!before.some((question) => question.stem === stem), `Existing duplicate stem: Q${item.number}`)
  }

  const firstSortOrder = Math.max(0, ...before.map((question) => question.sort_order ?? 0)) + 1
  payload = { questions: [], options: [] }
  for (const [index, item] of questions.entries()) {
    const questionId = randomUUID()
    payload.questions.push({
      id: questionId,
      subtest_id: subtestId,
      stimulus_id: null,
      kind: 'single_best_answer',
      topic: category,
      stem: `${item.prompt}\n\nSelect the strongest argument from the statements below.`,
      data: { source_id: `RA02-Q${item.number}`, source_collection: collection },
      explanation_text: item.explanation,
      difficulty: item.difficulty,
      sort_order: firstSortOrder + index,
      published: true,
      tags: [category],
    })
    for (const label of ['A', 'B', 'C', 'D']) {
      payload.options.push({
        id: randomUUID(),
        question_id: questionId,
        label,
        body: item.options[label],
        is_correct: label === item.correct,
        sort_order: label.charCodeAt(0) - 64,
      })
    }
  }

  assert.equal(payload.questions.length, 121)
  assert.equal(payload.options.length, 484)
  writeFileSync(`${sourceDir}/publication-manifest.json`, JSON.stringify(payload, null, 2) + '\n')

  const query = `DO $import$ BEGIN
    PERFORM pg_advisory_xact_lock(hashtext(${q(collection)}));
    IF EXISTS (SELECT 1 FROM public.questions WHERE data->>'source_collection' = ${q(collection)}) THEN
      RAISE EXCEPTION 'Collection appeared concurrently';
    END IF;
    INSERT INTO public.questions (id,subtest_id,stimulus_id,kind,topic,stem,data,explanation_text,difficulty,sort_order,published,tags)
    SELECT id,subtest_id,stimulus_id,kind::public.question_kind,topic,stem,data,explanation_text,difficulty,sort_order,published,tags
    FROM jsonb_to_recordset(${q(JSON.stringify(payload.questions))}::jsonb)
      AS x(id uuid,subtest_id uuid,stimulus_id uuid,kind text,topic text,stem text,data jsonb,explanation_text text,difficulty text,sort_order integer,published boolean,tags text[]);
    INSERT INTO public.question_options (id,question_id,label,body,is_correct,sort_order)
    SELECT id,question_id,label,body,is_correct,sort_order
    FROM jsonb_to_recordset(${q(JSON.stringify(payload.options))}::jsonb)
      AS o(id uuid,question_id uuid,label text,body text,is_correct boolean,sort_order integer);
  END $import$;`
  await sql(query, false)
}

const after = await fetchBank()
const published = after.filter((question) => question.data?.source_collection === collection)
assert.equal(published.length, 121)
assert.equal(after.length, before.length + (existing.length ? 0 : 121))

for (const expected of payload.questions) {
  const actual = published.find((question) => question.id === expected.id)
  assert.ok(actual, `Missing ${expected.data.source_id}`)
  assert.equal(actual.stem, expected.stem)
  assert.equal(actual.explanation_text, expected.explanation_text)
  assert.equal(actual.topic, category)
  assert.deepEqual(actual.tags, [category])
  assert.equal(actual.difficulty, expected.difficulty)
  assert.equal(actual.published, true)
  assert.equal(actual.options.length, 4)
  for (const expectedOption of payload.options.filter((option) => option.question_id === expected.id)) {
    const actualOption = actual.options.find((option) => option.id === expectedOption.id)
    assert.ok(actualOption, `Missing ${expected.data.source_id}.${expectedOption.label}`)
    assert.equal(actualOption.label, expectedOption.label)
    assert.equal(actualOption.body, expectedOption.body)
    assert.equal(actualOption.is_correct, expectedOption.is_correct)
    assert.equal(actualOption.sort_order, expectedOption.sort_order)
  }
}

const verification = {
  verifiedAt: new Date().toISOString(),
  collection,
  category,
  publishedQuestions: published.length,
  publishedOptions: published.reduce((sum, question) => sum + question.options.length, 0),
  explanations: published.filter((question) => question.explanation_text).length,
  decisionMakingQuestionsBefore: before.length,
  decisionMakingQuestionsAfter: after.length,
  recognisingAssumptionsQuestionsAfter: after.filter((question) => question.tags?.includes(category)).length,
  existingQuestionsPreserved: before.every((question) => after.some((candidate) => candidate.id === question.id)),
  alreadyPresent: existing.length === 121,
}
assert.equal(verification.existingQuestionsPreserved, true)
writeFileSync(`${sourceDir}/publication-verification.json`, JSON.stringify(verification, null, 2) + '\n')
console.log(JSON.stringify(verification))
