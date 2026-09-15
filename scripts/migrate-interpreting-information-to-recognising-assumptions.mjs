import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { clients, q, sql } from './lib/interview-operator.mjs'

const oldCategory = 'Interpreting Information'
const newCategory = 'Recognising Assumptions'
const collections = [
  {
    old: 'STUDOCYTE-DM-INTERPRETING-INFORMATION-01',
    next: 'STUDOCYTE-DM-RECOGNISING-ASSUMPTIONS-01',
    count: 60,
    sourceId(number) {
      return `RA01-Q${String(number).padStart(2, '0')}`
    },
  },
  {
    old: 'STUDOCYTE-DM-INTERPRETING-INFORMATION-02',
    next: 'STUDOCYTE-DM-RECOGNISING-ASSUMPTIONS-02',
    count: 121,
    sourceId(number) {
      return `RA02-Q${number}`
    },
  },
]

const { admin } = await clients()

async function fetchCollection(collection) {
  const { data, error } = await admin
    .from('questions')
    .select('id,stem,topic,tags,data,explanation_text,difficulty,published,sort_order,options:question_options(id,label,body,is_correct,sort_order)')
    .eq('data->>source_collection', collection)
    .order('sort_order')
  if (error) throw error
  return data
}

const sourceRows = new Map()
for (const collection of collections) {
  const [oldRows, destinationRows] = await Promise.all([
    fetchCollection(collection.old),
    fetchCollection(collection.next),
  ])
  assert.equal(oldRows.length, collection.count, `Expected ${collection.count} records in ${collection.old}`)
  assert.equal(destinationRows.length, 0, `Destination ${collection.next} already exists`)
  assert.ok(oldRows.every((row) => row.topic === oldCategory), `${collection.old} has an unexpected topic`)
  assert.ok(oldRows.every((row) => JSON.stringify(row.tags) === JSON.stringify([oldCategory])), `${collection.old} has unexpected tags`)
  assert.ok(oldRows.every((row) => row.published), `${collection.old} contains unpublished records`)
  assert.ok(oldRows.every((row) => row.options.length === 4 && row.options.filter((option) => option.is_correct).length === 1), `${collection.old} contains malformed options`)
  sourceRows.set(collection.old, oldRows)
}

const before = [...sourceRows.values()].flat()
assert.equal(before.length, 181)
const preserved = new Map(before.map((row) => [row.id, {
  stem: row.stem,
  explanation_text: row.explanation_text,
  difficulty: row.difficulty,
  published: row.published,
  sort_order: row.sort_order,
  options: [...row.options].sort((a, b) => a.sort_order - b.sort_order),
}]))

const updates = []
for (const collection of collections) {
  for (const [index, row] of sourceRows.get(collection.old).entries()) {
    const number = collection === collections[0] ? index + 1 : index + 61
    updates.push({
      id: row.id,
      topic: newCategory,
      tags: [newCategory],
      data: {
        ...row.data,
        source_collection: collection.next,
        source_id: collection.sourceId(number),
      },
    })
  }
}

const countChecks = collections.map((collection) => `
  IF (SELECT count(*) FROM public.questions WHERE data->>'source_collection' = ${q(collection.old)}) <> ${collection.count} THEN
    RAISE EXCEPTION 'Source collection count changed: ${collection.old}';
  END IF;
  IF EXISTS (SELECT 1 FROM public.questions WHERE data->>'source_collection' = ${q(collection.next)}) THEN
    RAISE EXCEPTION 'Destination collection appeared: ${collection.next}';
  END IF;`).join('')

const query = `DO $migration$ BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(${q('interpreting-information->recognising-assumptions')}));${countChecks}
  UPDATE public.questions AS questions
  SET topic = updates.topic,
      tags = updates.tags,
      data = updates.data
  FROM jsonb_to_recordset(${q(JSON.stringify(updates))}::jsonb)
    AS updates(id uuid,topic text,tags text[],data jsonb)
  WHERE questions.id = updates.id;
  IF (SELECT count(*) FROM public.questions WHERE topic = ${q(newCategory)} AND tags = ARRAY[${q(newCategory)}]::text[]) <> 181 THEN
    RAISE EXCEPTION 'Recognising Assumptions count did not reconcile';
  END IF;
END $migration$;`

await sql(query, false)

const migrated = []
for (const collection of collections) {
  const [oldRows, newRows] = await Promise.all([
    fetchCollection(collection.old),
    fetchCollection(collection.next),
  ])
  assert.equal(oldRows.length, 0, `${collection.old} still has records`)
  assert.equal(newRows.length, collection.count, `${collection.next} count mismatch`)
  migrated.push(...newRows)
}

assert.equal(migrated.length, 181)
for (const row of migrated) {
  assert.equal(row.topic, newCategory)
  assert.deepEqual(row.tags, [newCategory])
  const original = preserved.get(row.id)
  assert.ok(original, `Unexpected migrated question ${row.id}`)
  assert.equal(row.stem, original.stem)
  assert.equal(row.explanation_text, original.explanation_text)
  assert.equal(row.difficulty, original.difficulty)
  assert.equal(row.published, original.published)
  assert.equal(row.sort_order, original.sort_order)
  assert.deepEqual([...row.options].sort((a, b) => a.sort_order - b.sort_order), original.options)
}

const { count: oldCategoryRemaining, error: oldCategoryError } = await admin
  .from('questions')
  .select('id', { count: 'exact', head: true })
  .eq('topic', oldCategory)
  .contains('tags', [oldCategory])
if (oldCategoryError) throw oldCategoryError

const verification = {
  verifiedAt: new Date().toISOString(),
  migration: `${oldCategory} -> ${newCategory}`,
  collections: collections.map(({ old, next, count }) => ({ old, new: next, questions: count })),
  migratedQuestions: migrated.length,
  publishedOptions: migrated.reduce((sum, question) => sum + question.options.length, 0),
  explanations: migrated.filter((question) => question.explanation_text).length,
  oldCategoryRemaining,
  contentPreserved: true,
  duplicated: false,
}
assert.equal(oldCategoryRemaining, 0)
writeFileSync('../output/recognising-assumptions-migration-verification.json', JSON.stringify(verification, null, 2) + '\n')
console.log(JSON.stringify(verification))
