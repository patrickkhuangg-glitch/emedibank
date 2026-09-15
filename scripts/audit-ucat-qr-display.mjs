import { clients } from './lib/interview-operator.mjs'
import { mkdirSync, writeFileSync } from 'node:fs'

const { admin: db } = await clients()
async function get(query) {
  const { data, error } = await query
  if (error) throw Error(error.message)
  return data
}
const exam = await get(db.from('exams').select('id').eq('slug', 'ucat').single())
const sub = await get(db.from('subtests').select('id').eq('exam_id', exam.id).eq('slug', 'quantitative-reasoning').single())
const rows = []
for (let start = 0; ; start += 500) {
  const page = await get(db.from('questions').select('*, options:question_options(*), stimulus:stimuli(*)').eq('subtest_id', sub.id).order('id').range(start, start + 499))
  rows.push(...page)
  if (page.length < 500) break
}
const directory = 'artifacts/ucat-qr-cleanup'
mkdirSync(directory, { recursive: true })
const output = process.argv.includes('--after') ? 'after' : 'before'
writeFileSync(`${directory}/${output}.json`, JSON.stringify(rows, null, 2) + '\n')
const matches = []
for (const row of rows) {
  for (const [field, value] of Object.entries({ stem: row.stem, topic: row.topic, explanation: row.explanation_text, data: row.data, stimulus: row.stimulus })) {
    if (/diagrams|difficulty/i.test(JSON.stringify(value))) matches.push({ id: row.id, field, value })
  }
}
console.log(JSON.stringify({ questions: rows.length, matchingFields: matches.length, sample: matches.slice(0, 12) }, null, 2))
