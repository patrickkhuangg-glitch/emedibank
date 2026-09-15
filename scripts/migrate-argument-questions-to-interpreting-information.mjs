import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { clients, q, sql } from './lib/interview-operator.mjs'

const sourceDir = '../output/ucat-dm-strongest-argument-01'
const oldCollection = 'STUDOCYTE-DM-STRONGEST-ARGUMENT-01'
const newCollection = 'STUDOCYTE-DM-INTERPRETING-INFORMATION-01'
const newCategory = 'Interpreting Information'

const { admin } = await clients()
const { data: oldRows, error: oldError } = await admin
  .from('questions')
  .select('id,stem,topic,tags,data,explanation_text,difficulty,published,sort_order,options:question_options(id,label,body,is_correct,sort_order)')
  .eq('data->>source_collection', oldCollection)
  .order('sort_order')
if (oldError) throw oldError

const { data: destinationRows, error: destinationError } = await admin
  .from('questions')
  .select('id')
  .eq('data->>source_collection', newCollection)
if (destinationError) throw destinationError

assert.equal(oldRows.length, 60, 'Expected exactly 60 source questions')
assert.equal(destinationRows.length, 0, 'Destination collection already exists')
assert.ok(oldRows.every((row) => row.topic === 'Strongest Argument'))
assert.ok(oldRows.every((row) => JSON.stringify(row.tags) === JSON.stringify(['Strongest Argument'])))
assert.ok(oldRows.every((row) => row.published))
assert.ok(oldRows.every((row) => row.options.length === 4 && row.options.filter((option) => option.is_correct).length === 1))

const preserved = new Map(oldRows.map((row) => [row.id, {
  stem: row.stem,
  explanation_text: row.explanation_text,
  difficulty: row.difficulty,
  published: row.published,
  sort_order: row.sort_order,
  options: [...row.options].sort((a, b) => a.sort_order - b.sort_order),
}]))

const updates = oldRows.map((row, index) => ({
  id: row.id,
  topic: newCategory,
  tags: [newCategory],
  data: {
    ...row.data,
    source_collection: newCollection,
    source_id: `II01-Q${String(index + 1).padStart(2, '0')}`,
  },
}))

const query = `DO $migration$ BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(${q(oldCollection + '->' + newCollection)}));
  IF (SELECT count(*) FROM public.questions WHERE data->>'source_collection' = ${q(oldCollection)}) <> 60 THEN
    RAISE EXCEPTION 'Source collection count changed';
  END IF;
  IF EXISTS (SELECT 1 FROM public.questions WHERE data->>'source_collection' = ${q(newCollection)}) THEN
    RAISE EXCEPTION 'Destination collection appeared concurrently';
  END IF;
  UPDATE public.questions AS questions
  SET topic = updates.topic,
      tags = updates.tags,
      data = updates.data
  FROM jsonb_to_recordset(${q(JSON.stringify(updates))}::jsonb)
    AS updates(id uuid,topic text,tags text[],data jsonb)
  WHERE questions.id = updates.id;
END $migration$;`

await sql(query, false)

const { data: migrated, error: migratedError } = await admin
  .from('questions')
  .select('id,stem,topic,tags,data,explanation_text,difficulty,published,sort_order,options:question_options(id,label,body,is_correct,sort_order)')
  .eq('data->>source_collection', newCollection)
  .order('sort_order')
if (migratedError) throw migratedError

const { count: oldCount, error: oldCountError } = await admin
  .from('questions')
  .select('id', { count: 'exact', head: true })
  .eq('data->>source_collection', oldCollection)
if (oldCountError) throw oldCountError

assert.equal(migrated.length, 60)
assert.equal(oldCount, 0)
for (const [index, row] of migrated.entries()) {
  assert.equal(row.topic, newCategory)
  assert.deepEqual(row.tags, [newCategory])
  assert.equal(row.data.source_id, `II01-Q${String(index + 1).padStart(2, '0')}`)
  const before = preserved.get(row.id)
  assert.ok(before)
  assert.equal(row.stem, before.stem)
  assert.equal(row.explanation_text, before.explanation_text)
  assert.equal(row.difficulty, before.difficulty)
  assert.equal(row.published, before.published)
  assert.equal(row.sort_order, before.sort_order)
  assert.deepEqual([...row.options].sort((a, b) => a.sort_order - b.sort_order), before.options)
}

const manifest = JSON.parse(readFileSync(`${sourceDir}/publication-manifest.json`, 'utf8'))
for (const [index, question] of manifest.questions.entries()) {
  question.topic = newCategory
  question.tags = [newCategory]
  question.data.source_collection = newCollection
  question.data.source_id = `II01-Q${String(index + 1).padStart(2, '0')}`
}
writeFileSync(`${sourceDir}/publication-manifest.json`, JSON.stringify(manifest, null, 2) + '\n')

const verification = {
  verifiedAt: new Date().toISOString(),
  migration: `${oldCollection} -> ${newCollection}`,
  category: newCategory,
  migratedQuestions: migrated.length,
  publishedOptions: migrated.reduce((sum, question) => sum + question.options.length, 0),
  explanations: migrated.filter((question) => question.explanation_text).length,
  oldCollectionRemaining: oldCount,
  contentPreserved: true,
  duplicated: false,
}
writeFileSync(`${sourceDir}/publication-verification.json`, JSON.stringify(verification, null, 2) + '\n')
console.log(JSON.stringify(verification))
