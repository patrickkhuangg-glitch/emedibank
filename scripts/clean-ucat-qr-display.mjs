import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { q, sql } from './lib/interview-operator.mjs'

const directory = 'artifacts/ucat-qr-cleanup'
const rows = JSON.parse(readFileSync(`${directory}/before.json`, 'utf8'))
const cleanPassage = (text) => text
  .split(/\r?\n/)
  .filter((line) => !/^\s*#{1,6}\s+(Diagrams|Tables|complex|Text only)\s*$/i.test(line)
    && !/^\s*(?:#{1,6}\s*)?Difficulty:\s*(easy|medium|hard)\s*$/i.test(line))
  .join('\n').replace(/\n{3,}/g, '\n\n').trim()

const questions = rows.filter((row) => row.topic === 'Diagrams')
const stimuli = [...new Map(rows.filter((row) => row.stimulus).map((row) => [row.stimulus.id, row.stimulus])).values()]
  .filter((stimulus) => typeof stimulus.data?.passage === 'string' && cleanPassage(stimulus.data.passage) !== stimulus.data.passage)
const changes = [
  ...questions.map((row) => ({ table: 'questions', id: row.id, field: 'topic', before: row.topic, after: null })),
  ...stimuli.map((row) => ({ table: 'stimuli', id: row.id, field: 'data', before: row.data, after: { ...row.data, passage: cleanPassage(row.data.passage) } })),
]
const affected = rows.filter((row) => questions.some((item) => item.id === row.id) || stimuli.some((item) => item.id === row.stimulus_id))
const summary = { auditedQuestions: rows.length, diagramSubtitlesRemoved: questions.length, sharedPassagesCleaned: stimuli.length, questionsUsingCleanedPassages: rows.filter((row) => stimuli.some((item) => item.id === row.stimulus_id)).length, uniqueQuestionsAffected: affected.length }
writeFileSync(`${directory}/changes.json`, JSON.stringify({ summary, changes }, null, 2) + '\n')
console.log(JSON.stringify(summary, null, 2))

if (process.argv.includes('--apply')) {
  assert.equal(new Set(rows.map((row) => row.subtest_id)).size, 1)
  const subtestId = rows[0].subtest_id
  const statements = changes.map((change) => {
    const oldValue = change.field === 'data' ? `${q(JSON.stringify(change.before))}::jsonb` : q(change.before)
    const newValue = change.field === 'data' ? `${q(JSON.stringify(change.after))}::jsonb` : 'null'
    return `update public.${change.table} set ${change.field} = ${newValue}
      where id = ${q(change.id)}::uuid and subtest_id = ${q(subtestId)}::uuid
        and ${change.field} is not distinct from ${oldValue};
      get diagnostics changed_count = row_count;
      if changed_count <> 1 then raise exception 'Question content changed since audit; rolling back'; end if;`
  })
  await sql(`do $cleanup$ declare changed_count integer; begin
    if not exists (select 1 from subtests s join exams e on e.id=s.exam_id where s.id=${q(subtestId)}::uuid and e.slug='ucat' and s.slug='quantitative-reasoning') then raise exception 'Wrong question bank'; end if;
    if exists (select 1 from questions where stimulus_id in (${stimuli.map((row) => `${q(row.id)}::uuid`).join(',')}) and subtest_id <> ${q(subtestId)}::uuid) then raise exception 'Shared stimulus outside target bank'; end if;
    ${statements.join('\n')}
  end $cleanup$;`, false)
  console.log('Applied all changes atomically; original content retained in before.json.')
}
