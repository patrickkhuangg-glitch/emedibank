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
  const page = await get(db.from('questions').select('id,stem,topic,tags,data,published,stimulus_id,explanation_text,stimulus:stimuli(data)').eq('subtest_id', sub.id).order('id').range(start, start + 499))
  rows.push(...page)
  if (page.length < 500) break
}
const directory = 'artifacts/qr-question-types'
mkdirSync(directory, { recursive: true })
writeFileSync(`${directory}/bank-snapshot.json`, JSON.stringify({ fetchedAt: new Date().toISOString(), rows }, null, 2) + '\n')
const count = key => Object.entries(rows.filter(q => q.published).reduce((acc, q) => { const value = key(q) || '(missing)'; acc[value] = (acc[value] || 0) + 1; return acc }, {})).sort((a,b) => b[1]-a[1])
console.log(JSON.stringify({ total: rows.length, published: rows.filter(q => q.published).length, families: count(q => q.data?.reasoning_family), topics: count(q => q.topic), tags: count(q => q.tags?.join(', ')) }, null, 2))
