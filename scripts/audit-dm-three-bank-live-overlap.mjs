import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { clients } from './lib/interview-operator.mjs'

const outputDirectory = '../output/ucat-dm-three-bank-import-01'
const banks = {
  logicalPuzzles: JSON.parse(readFileSync(`${outputDirectory}/logical-puzzles-question-bank.json`, 'utf8')),
  syllogisms: JSON.parse(readFileSync(`${outputDirectory}/syllogisms-question-bank.json`, 'utf8')),
  interpretingInformation: JSON.parse(readFileSync(`${outputDirectory}/interpreting-information-question-bank.json`, 'utf8')),
}
const { admin } = await clients()
async function get(query) {
  const { data, error } = await query
  if (error) throw error
  return data
}
const exam = await get(admin.from('exams').select('id').eq('name', 'UCAT').single())
const subtest = await get(admin.from('subtests').select('id').eq('exam_id', exam.id).eq('name', 'Decision Making').single())
const live = []
for (let start = 0; ; start += 500) {
  const page = await get(admin.from('questions')
    .select('id,stem,topic,tags,data,difficulty,published,options:question_options(id,label,body,is_correct,sort_order)')
    .eq('subtest_id', subtest.id)
    .range(start, start + 499))
  live.push(...page)
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
const byStem = new Map()
const byStatements = new Map()
for (const question of live) {
  const key = normalize(question.stem)
  byStem.set(key, [...(byStem.get(key) ?? []), question])
  if (question.data?.statements?.length) {
    const statementKey = JSON.stringify(question.data.statements.map((statement) => ({ text: normalize(statement.text), correct: statement.correct })))
    byStatements.set(statementKey, [...(byStatements.get(statementKey) ?? []), question])
  }
}

const result = {}
const plan = { subtestId: subtest.id, banks: {} }
for (const [name, bank] of Object.entries(banks)) {
  const exact = []
  const unique = []
  const near = []
  for (const authored of bank.questions) {
    const statementKey = authored.statements ? JSON.stringify(authored.statements.map((statement) => ({ text: normalize(statement.text), correct: statement.correct }))) : null
    const stemMatches = byStem.get(normalize(authored.stem)) ?? []
    const statementMatches = statementKey ? byStatements.get(statementKey) ?? [] : []
    const matches = [...new Map([...stemMatches, ...statementMatches].map((question) => [question.id, question])).values()]
    if (matches.length) {
      assert.equal(matches.length, 1, `Multiple live exact matches for ${name} Q${authored.number}`)
      const liveQuestion = matches[0]
      assert.ok(liveQuestion.published)
      assert.ok(liveQuestion.topic === bank.category || liveQuestion.tags?.includes(bank.category), `Exact match is in the wrong category: ${name} Q${authored.number}`)
      if (authored.options) {
        const expectedBodies = authored.options.map((option) => normalize(option.body)).sort()
        const actualBodies = liveQuestion.options.map((option) => normalize(option.body)).sort()
        const expectedCorrectBody = normalize(authored.options.find((option) => option.label === authored.correct).body)
        const actualCorrectBody = normalize(liveQuestion.options.find((option) => option.is_correct).body)
        assert.deepEqual(actualBodies, expectedBodies, `Exact-match option content differs for ${name} Q${authored.number}`)
        assert.equal(actualCorrectBody, expectedCorrectBody, `Exact-match correct answer differs for ${name} Q${authored.number}`)
      }
      if (authored.statements) assert.deepEqual(liveQuestion.data?.statements, authored.statements, `Exact-match statements differ for ${name} Q${authored.number}`)
      exact.push({ sourceNumber: authored.number, sourceId: authored.sourceId ?? null, liveQuestionId: liveQuestion.id, liveCollection: liveQuestion.data?.source_collection ?? null, mockOnly: liveQuestion.data?.mock_only === true, matchType: stemMatches.length ? 'exact stem' : 'identical conclusions and keys' })
    } else {
      unique.push(authored)
      let best = null
      for (const liveQuestion of live) {
        const similarity = jaccard(authored.stem, liveQuestion.stem)
        if (!best || similarity > best.similarity) best = { sourceNumber: authored.number, liveQuestionId: liveQuestion.id, similarity, liveStem: liveQuestion.stem }
      }
      if (best?.similarity >= 0.82) near.push(best)
    }
  }
  result[name] = { sourceQuestions: bank.questions.length, exactLiveMatches: exact.length, uniqueToPublish: unique.length, highSimilarityNonExactMatches: near }
  plan.banks[name] = { collection: bank.collection, category: bank.category, exact, questions: unique }
}

assert.equal(result.logicalPuzzles.exactLiveMatches, 60, 'Expected the expanded Logical Puzzles file to contain the 60 already-published items')
assert.equal(result.logicalPuzzles.uniqueToPublish, 61)
assert.equal(result.syllogisms.exactLiveMatches, 1, 'Expected one Syllogism already present in the live bank')
assert.equal(result.syllogisms.uniqueToPublish, 120)
assert.equal(result.interpretingInformation.exactLiveMatches, 6, 'Expected six matches with the previously reserved Drawing Conclusions units')
assert.equal(result.interpretingInformation.uniqueToPublish, 57)
assert.ok(plan.banks.logicalPuzzles.exact.every((item) => item.liveCollection === 'STUDOCYTE-DM-LOGICAL-PUZZLES-01'))
assert.ok(plan.banks.interpretingInformation.exact.every((item) => item.liveCollection === 'STUDOCYTE-DM-INTERPRETING-INFORMATION-MOCK-01' && item.mockOnly))

const audit = {
  status: 'passed',
  checkedAt: new Date().toISOString(),
  liveDecisionMakingQuestions: live.length,
  ...result,
  totalSourceQuestions: Object.values(result).reduce((sum, item) => sum + item.sourceQuestions, 0),
  existingExactMatchesPreserved: Object.values(result).reduce((sum, item) => sum + item.exactLiveMatches, 0),
  totalUniqueToPublish: Object.values(result).reduce((sum, item) => sum + item.uniqueToPublish, 0),
}
writeFileSync(`${outputDirectory}/live-overlap-audit.json`, JSON.stringify(audit, null, 2) + '\n')
writeFileSync(`${outputDirectory}/publish-plan.json`, JSON.stringify(plan, null, 2) + '\n')
console.log(JSON.stringify(audit))
