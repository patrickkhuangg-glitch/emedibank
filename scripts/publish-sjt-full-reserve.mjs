import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { clients, q, sql } from './lib/interview-operator.mjs'

const dir = 'artifacts/sjt-full-reserve-release'
const manifestText = readFileSync(`${dir}/import-manifest.json`, 'utf8')
const manifest = JSON.parse(manifestText)
const audit = JSON.parse(readFileSync(`${dir}/audit.json`, 'utf8'))
const beforeSnapshot = JSON.parse(readFileSync(`${dir}/before-snapshot.json`, 'utf8'))
assert.equal(audit.status, 'passed')
assert.equal(createHash('sha256').update(manifestText).digest('hex'), audit.manifestSha256, 'Audited manifest changed')
assert.equal(manifest.collection, 'STUDOCYTE-SJT-FULL-RESERVE-01-08')
assert.equal(manifest.questions.length, 552)
assert.equal(manifest.stimuli.length, 136)
assert.equal(manifest.options.length, 2080)
assert.equal(manifest.assignments.length, 552)

const { admin } = await clients()
const get = async (query) => {
  const { data, error } = await query
  if (error) throw Error(error.message)
  return data
}
const readBank = async () => {
  const all = []
  for (let start = 0; ; start += 500) {
    const page = await get(admin.from('questions').select('*,options:question_options(*),stimulus:stimuli(*)').eq('subtest_id', manifest.subtest.id).order('id').range(start, start + 499))
    all.push(...page)
    if (page.length < 500) return all
  }
}
const normalQuestion = (row) => ({ ...row, options: [...(row.options ?? [])].sort((a, b) => a.id.localeCompare(b.id)) })
const current = await readBank()
const currentAssignments = await get(admin.from('mock_question_assignments').select('*').eq('exam_id', manifest.exam.id).order('mock_key').order('sort_order'))
assert.equal(current.length, beforeSnapshot.questions.length, 'SJT bank changed after preparation; prepare again')
assert.equal(currentAssignments.length, beforeSnapshot.assignments.length, 'Mock assignments changed after preparation; prepare again')
for (const before of beforeSnapshot.questions) assert.deepEqual(normalQuestion(current.find((row) => row.id === before.id)), normalQuestion(before), `Existing question changed after preparation: ${before.id}`)
for (const before of beforeSnapshot.assignments) assert.deepEqual(currentAssignments.find((row) => row.id === before.id), before, `Existing assignment changed after preparation: ${before.id}`)

const ids = new Set(manifest.questions.map((question) => question.id))
const keys = [...new Set(manifest.assignments.map((assignment) => assignment.mock_key))]
const existing = current.filter((question) => ids.has(question.id) || question.data?.source_collection === manifest.collection)
if (existing.length) assert.equal(existing.length, 552, 'Partial SJT reserve collection exists; manual recovery is required')
else {
  assert.equal(currentAssignments.filter((assignment) => keys.includes(assignment.mock_key)).length, 0, 'Reserved full-exam keys already contain assignments')
  const query = `DO $import$ BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('studocyte-sjt-full-reserve-01-08'));
  IF EXISTS(SELECT 1 FROM public.questions WHERE data->>'source_collection'=${q(manifest.collection)}) OR EXISTS(SELECT 1 FROM public.mock_question_assignments WHERE exam_id=${q(manifest.exam.id)}::uuid AND mock_key=ANY(ARRAY[${keys.map(q).join(',')}])) THEN RAISE EXCEPTION 'SJT collection or assignment appeared concurrently'; END IF;
  INSERT INTO public.stimuli(id,subtest_id,title,data,sort_order) SELECT id,subtest_id,title,data,sort_order FROM jsonb_to_recordset(${q(JSON.stringify(manifest.stimuli))}::jsonb) AS s(id uuid,subtest_id uuid,title text,data jsonb,sort_order integer);
  INSERT INTO public.questions(id,subtest_id,stimulus_id,kind,topic,stem,data,explanation_text,difficulty,sort_order,published,tags) SELECT id,subtest_id,stimulus_id,kind::public.question_kind,topic,stem,data,explanation_text,difficulty,sort_order,published,tags FROM jsonb_to_recordset(${q(JSON.stringify(manifest.questions))}::jsonb) AS x(id uuid,subtest_id uuid,stimulus_id uuid,kind text,topic text,stem text,data jsonb,explanation_text text,difficulty text,sort_order integer,published boolean,tags text[]);
  INSERT INTO public.question_options(id,question_id,label,body,is_correct,sort_order) SELECT id,question_id,label,body,is_correct,sort_order FROM jsonb_to_recordset(${q(JSON.stringify(manifest.options))}::jsonb) AS o(id uuid,question_id uuid,label text,body text,is_correct boolean,sort_order integer);
  INSERT INTO public.mock_question_assignments(exam_id,subtest_id,mock_key,question_id,sort_order) SELECT exam_id,subtest_id,mock_key,question_id,sort_order FROM jsonb_to_recordset(${q(JSON.stringify(manifest.assignments))}::jsonb) AS a(exam_id uuid,subtest_id uuid,mock_key text,question_id uuid,sort_order integer);
END $import$;`
  await sql(query, false)
}

const after = await readBank()
const assignmentsAfter = await get(admin.from('mock_question_assignments').select('*').eq('exam_id', manifest.exam.id).order('mock_key').order('sort_order'))
for (const expected of manifest.questions) {
  const actual = after.find((question) => question.id === expected.id)
  assert(actual, `Missing published question ${expected.id}`)
  for (const [key, value] of Object.entries(expected)) assert.deepEqual(actual[key], value, `${expected.data.source_question_id}.${key}`)
  const expectedStimulus = manifest.stimuli.find((stimulus) => stimulus.id === expected.stimulus_id)
  for (const [key, value] of Object.entries(expectedStimulus)) assert.deepEqual(actual.stimulus[key], value, `${expected.data.source_question_id}.stimulus.${key}`)
  const expectedOptions = manifest.options.filter((option) => option.question_id === expected.id)
  assert.equal(actual.options.length, expectedOptions.length, `${expected.data.source_question_id}.optionCount`)
  for (const option of expectedOptions) {
    const stored = actual.options.find((candidate) => candidate.id === option.id)
    assert(stored)
    for (const [key, value] of Object.entries(option)) assert.deepEqual(stored[key], value, `${expected.data.source_question_id}.option.${option.label}.${key}`)
  }
}
for (const before of beforeSnapshot.questions) assert.deepEqual(normalQuestion(after.find((row) => row.id === before.id)), normalQuestion(before), `Existing question changed during publication: ${before.id}`)
for (const before of beforeSnapshot.assignments) assert.deepEqual(assignmentsAfter.find((row) => row.id === before.id), before, `Existing assignment changed during publication: ${before.id}`)
for (const expected of manifest.assignments) {
  const actual = assignmentsAfter.find((assignment) => assignment.mock_key === expected.mock_key && assignment.question_id === expected.question_id)
  assert(actual, `Missing reserved assignment ${expected.mock_key}:${expected.sort_order}`)
  for (const [key, value] of Object.entries(expected)) assert.deepEqual(actual[key], value)
}
assert.equal(assignmentsAfter.filter((assignment) => keys.includes(assignment.mock_key)).length, 552)
const newQuestions = after.filter((question) => ids.has(question.id))
assert.equal(newQuestions.length, 552)
assert(newQuestions.every((question) => question.published === true && question.data?.mock_only === true))
for (const key of keys) {
  const formAssignments = assignmentsAfter.filter((assignment) => assignment.mock_key === key).sort((a, b) => a.sort_order - b.sort_order)
  assert.equal(formAssignments.length, 69)
  const ending = formAssignments.slice(65).map((assignment) => newQuestions.find((question) => question.id === assignment.question_id))
  assert(ending.every((question) => question.data?.mostLeast))
}
const practiceBefore = beforeSnapshot.questions.filter((question) => question.published && question.data?.mock_only !== true).length
const reservedBefore = beforeSnapshot.questions.filter((question) => question.published && question.data?.mock_only === true).length
const practiceCount = await admin.from('questions').select('id', { count: 'exact', head: true }).eq('subtest_id', manifest.subtest.id).eq('published', true).or('data->>mock_only.is.null,data->>mock_only.neq.true')
if (practiceCount.error) throw Error(practiceCount.error.message)
const reservedCount = await admin.from('questions').select('id', { count: 'exact', head: true }).eq('subtest_id', manifest.subtest.id).eq('published', true).eq('data->>mock_only', 'true')
if (reservedCount.error) throw Error(reservedCount.error.message)
assert.equal(practiceCount.count, practiceBefore, 'Ordinary practice-bank count changed')
assert.equal(reservedCount.count, reservedBefore + 552, 'Reserved question count did not increase by 552')

const verification = {
  published: true,
  reserved: true,
  verifiedAt: new Date().toISOString(),
  collection: manifest.collection,
  forms: 8,
  questions: 552,
  stimuli: 136,
  options: 2080,
  assignments: 552,
  questionsPerForm: 69,
  ratingQuestionsPerForm: 65,
  mostLeastPerForm: 4,
  assignmentKeys: keys,
  practiceQuestionsBefore: practiceBefore,
  practiceQuestionsAfter: practiceCount.count,
  reservedQuestionsBefore: reservedBefore,
  reservedQuestionsAfter: reservedCount.count,
  ordinaryPracticeUnaffected: true,
  existingQuestionsPreserved: true,
  existingAssignmentsPreserved: true,
  alreadyPresent: existing.length === 552,
  allStoredContentMatches: true,
}
writeFileSync(`${dir}/published-questions.json`, JSON.stringify(newQuestions, null, 2) + '\n')
writeFileSync(`${dir}/verification.json`, JSON.stringify(verification, null, 2) + '\n')
console.log(JSON.stringify(verification))
