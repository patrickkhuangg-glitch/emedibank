import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { clients } from './lib/interview-operator.mjs'

const sourcePath = '../tmp/ucat-inventory-refresh/workbook-rows.json'
const outDir = 'artifacts/sjt-full-reserve-release'
const collection = 'STUDOCYTE-SJT-FULL-RESERVE-01-08'
const rows = JSON.parse(readFileSync(sourcePath, 'utf8'))
const table = (name) => {
  const [headers, ...body] = rows[name]
  return body.map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])))
}
const questionBank = table('Question Bank')
const importRows = table('Import')
assert.equal(questionBank.length, 552)
assert.equal(importRows.length, 552)

const uuid = (seed) => {
  const bytes = createHash('sha256').update(seed).digest().subarray(0, 16)
  bytes[6] = (bytes[6] & 0x0f) | 0x50
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = bytes.toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
const normalise = (value) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const { admin } = await clients()
const get = async (query) => {
  const { data, error } = await query
  if (error) throw Error(error.message)
  return data
}
const exam = await get(admin.from('exams').select('id,slug,name').eq('slug', 'ucat').single())
const subtest = await get(admin.from('subtests').select('id,slug,name').eq('exam_id', exam.id).eq('slug', 'situational-judgement').single())
const currentQuestions = []
for (let start = 0; ; start += 500) {
  const page = await get(admin.from('questions').select('*,options:question_options(*),stimulus:stimuli(*)').eq('subtest_id', subtest.id).order('id').range(start, start + 499))
  currentQuestions.push(...page)
  if (page.length < 500) break
}
const currentAssignments = await get(admin.from('mock_question_assignments').select('*').eq('exam_id', exam.id).order('mock_key').order('sort_order'))

const stimuliByKey = new Map()
const questions = []
const options = []
const assignments = []
for (let index = 0; index < questionBank.length; index++) {
  const editorial = questionBank[index]
  const imported = importRows[index]
  const mock = Number(editorial.Mock)
  const number = Number(editorial.Question)
  const mockKey = `full-ucat-${mock}`
  assert.equal(editorial['Question ID'], `SJT-MM${String(mock).padStart(2, '0')}-Q${String(number).padStart(2, '0')}`)
  assert.equal(imported.exam, 'UCAT')
  assert.equal(imported.subtest, 'Situational Judgement')
  assert.equal(imported.published, 'no')
  const stimulusKey = imported.stimulus_key
  if (!stimuliByKey.has(stimulusKey)) {
    stimuliByKey.set(stimulusKey, {
      id: uuid(`${collection}:stimulus:${stimulusKey}`),
      subtest_id: subtest.id,
      title: stimulusKey,
      data: { passage: imported.passage },
      sort_order: 0,
    })
  } else {
    assert.equal(stimuliByKey.get(stimulusKey).data.passage, imported.passage)
  }
  const questionId = uuid(`${collection}:question:${editorial['Question ID']}`)
  const data = {
    mock_only: true,
    mock_key: mockKey,
    source_collection: collection,
    source_question_id: editorial['Question ID'],
    source_scenario_id: editorial['Scenario ID'],
    source_domain: editorial.Domain,
    source_type: editorial.Type,
  }
  if (imported.type === 'most_least') {
    const actions = String(imported.actions).split(';').map((text) => text.trim()).filter(Boolean).map((text) => ({ text }))
    assert.equal(actions.length, 3)
    data.mostLeast = {
      actions,
      correctMost: Number(imported.most) - 1,
      correctLeast: Number(imported.least) - 1,
    }
  }
  questions.push({
    id: questionId,
    subtest_id: subtest.id,
    stimulus_id: stimuliByKey.get(stimulusKey).id,
    kind: 'single_best_answer',
    topic: imported.topic || null,
    stem: imported.stem,
    data,
    explanation_text: imported.explanation,
    difficulty: imported.difficulty,
    sort_order: number,
    published: true,
    tags: String(imported.tags).split(';').map((tag) => tag.trim()).filter(Boolean),
  })
  if (imported.type === 'mcq') {
    const correct = String(imported.correct).toUpperCase()
    for (const [optionIndex, label] of ['A', 'B', 'C', 'D'].entries()) {
      const body = imported[`option_${label.toLowerCase()}`]
      assert(body)
      options.push({
        id: uuid(`${collection}:option:${editorial['Question ID']}:${label}`),
        question_id: questionId,
        label,
        body,
        is_correct: label === correct,
        sort_order: optionIndex + 1,
      })
    }
  }
  assignments.push({ exam_id: exam.id, subtest_id: subtest.id, mock_key: mockKey, question_id: questionId, sort_order: number })
}

const stimuli = [...stimuliByKey.values()]
assert.equal(stimuli.length, 136)
assert.equal(questions.length, 552)
assert.equal(options.length, 2080)
assert.equal(assignments.length, 552)
assert.equal(new Set(questions.map((question) => question.id)).size, 552)
assert.equal(new Set(stimuli.map((stimulus) => stimulus.id)).size, 136)
assert.equal(new Set(options.map((option) => option.id)).size, 2080)
assert.equal(questions.filter((question) => question.data.mostLeast).length, 32)
for (let mock = 1; mock <= 8; mock++) {
  const key = `full-ucat-${mock}`
  const form = assignments.filter((assignment) => assignment.mock_key === key)
  assert.equal(form.length, 69)
  assert.deepEqual(form.map((assignment) => assignment.sort_order), Array.from({ length: 69 }, (_, index) => index + 1))
  const ending = form.slice(65).map((assignment) => questions.find((question) => question.id === assignment.question_id))
  assert(ending.every((question) => question.data.mostLeast))
  assert(form.slice(0, 65).every((assignment) => !questions.find((question) => question.id === assignment.question_id).data.mostLeast))
}
const liveComposite = new Set(currentQuestions.map((question) => normalise(`${question.stimulus?.data?.passage ?? ''} ${question.stem}`)))
const exactLiveMatches = questions.filter((question) => {
  const stimulus = stimuli.find((candidate) => candidate.id === question.stimulus_id)
  return liveComposite.has(normalise(`${stimulus.data.passage} ${question.stem}`))
})
assert.equal(exactLiveMatches.length, 0, 'One or more authored questions already exist in the live SJT bank')
assert.equal(currentQuestions.filter((question) => question.data?.source_collection === collection).length, 0)
assert.equal(currentAssignments.filter((assignment) => /^full-ucat-[1-8]$/.test(assignment.mock_key)).length, 0)

const manifest = { collection, exam, subtest, stimuli, questions, options, assignments }
const manifestText = JSON.stringify(manifest, null, 2) + '\n'
mkdirSync(outDir, { recursive: true })
writeFileSync(`${outDir}/import-manifest.json`, manifestText)
writeFileSync(`${outDir}/before-snapshot.json`, JSON.stringify({ fetchedAt: new Date().toISOString(), questions: currentQuestions, assignments: currentAssignments }, null, 2) + '\n')
writeFileSync(`${outDir}/audit.json`, JSON.stringify({
  status: 'passed',
  preparedAt: new Date().toISOString(),
  sourcePath,
  sourceSha256: createHash('sha256').update(readFileSync(sourcePath)).digest('hex'),
  manifestSha256: createHash('sha256').update(manifestText).digest('hex'),
  collection,
  existingSjtQuestions: currentQuestions.length,
  existingAssignments: currentAssignments.length,
  newQuestions: questions.length,
  newStimuli: stimuli.length,
  newOptions: options.length,
  newAssignments: assignments.length,
  forms: 8,
  questionsPerForm: 69,
  ratingQuestionsPerForm: 65,
  mostLeastPerForm: 4,
  published: true,
  mockOnly: true,
  assignmentKeys: Array.from({ length: 8 }, (_, index) => `full-ucat-${index + 1}`),
  exactLiveMatches: 0,
}, null, 2) + '\n')
console.log(JSON.stringify({ status: 'passed', questions: 552, stimuli: 136, options: 2080, assignments: 552, exactLiveMatches: 0 }))
