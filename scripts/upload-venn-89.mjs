import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { sql, q as quote, APP } from './lib/interview-operator.mjs'

const sourceDir = fileURLToPath(new URL('../../output/ucat-venn-89/', import.meta.url))
const collection = 'ucat-dm-original-venn-89-2026-09-09'
const raw = readFileSync(`${sourceDir}/questions.json`, 'utf8')
const sourceHash = createHash('sha256').update(raw).digest('hex')
const bank = JSON.parse(raw)
const validation = JSON.parse(readFileSync(`${sourceDir}/validation.json`, 'utf8'))
const dir = fileURLToPath(new URL('../artifacts/venn-89-upload/', import.meta.url))
mkdirSync(dir, { recursive: true })
assert.equal(bank.length, 89)
assert.equal(validation.question_count, 89)
assert.equal(new Set(bank.map(item => item.id)).size, 89)

const popcount = mask => [1, 2, 4].filter(bit => mask & bit).length
const predicates = {
  union_exclude: m => !!(m & 3) && !(m & 4),
  exactly_two: m => popcount(m) === 2,
  at_least_two: m => popcount(m) >= 2,
  exactly_one: m => popcount(m) === 1,
  neither_two: m => !(m & 3),
  both_inclusive: m => (m & 3) === 3,
  union_inclusive: m => !!(m & 3),
  one_exclude: m => !!(m & 4) && !(m & 1),
  two_of_pair: m => !!(m & 1) && popcount(m & 6) === 1,
  at_most_one: m => popcount(m) <= 1,
  xor_pair: m => !!(m & 1) !== !!(m & 2),
  at_least_one: m => m !== 0,
  not_one: m => !(m & 1),
}
for (const item of bank) {
  assert.equal(item.options.length, 4)
  assert.equal(new Set(item.options).size, 4)
  const entries = Object.entries(item.values).map(([mask, count]) => [Number(mask), count])
  assert.equal(entries.length, 8)
  const sum = predicate => entries.reduce((total, [mask, count]) => total + (predicate(mask) ? count : 0), 0)
  let expected
  if (predicates[item.kind]) expected = sum(predicates[item.kind])
  else if (item.kind === 'difference') expected = sum(m => m & 1) - sum(m => m & 2)
  else if (item.kind === 'compare_exact') expected = sum(m => popcount(m) === 1) - sum(m => popcount(m) === 2)
  else {
    const predicate = { missing_pair: m => m & 1, missing_none: () => true, missing_triple: m => popcount(m) >= 2, missing_single: m => popcount(m) === 1 }[item.kind]
    assert.ok(predicate, `Unknown question kind ${item.kind}`)
    expected = item.given - entries.reduce((total, [mask, count]) => total + (mask !== item.hidden && predicate(mask) ? count : 0), 0)
    assert.equal(expected, item.values[String(item.hidden)])
  }
  assert.equal(item.answer, expected, `Q${item.id} calculation`)
  assert.equal(item.options[item.correct], expected, `Q${item.id} answer key`)
  assert.equal(item.total, sum(() => true))
  assert.ok(item.explanation && item.intro && item.prompt)
  assert.ok(item.svg.startsWith('<svg '))
  assert.ok(!/<script|<foreignObject|\bon\w+\s*=|(?:href|src)\s*=/i.test(item.svg), 'Diagram must be a self-contained static SVG')
  const numericText = [...item.svg.matchAll(/<text[^>]*>([^<]+)<\/text>/g)].slice(-8).map(match => match[1])
  const masks = [1, 2, 3, 5, 6, 7, 4, 0]
  assert.deepEqual(numericText, masks.map(mask => mask === item.hidden ? 'x' : String(item.values[String(mask)])), `Q${item.id} diagram values`)
}

const subtests = await sql(`SELECT s.id FROM public.subtests s JOIN public.exams e ON e.id=s.exam_id WHERE e.name='UCAT' AND s.name='Decision Making'`)
assert.equal(subtests.length, 1)
const subtest = subtests[0].id

async function snapshot() {
  return sql(`SELECT q.id,q.sort_order,q.published,q.tags,q.data->>'source_collection' AS collection,
    md5(to_jsonb(q)::text) AS question_hash,
    (SELECT md5(coalesce(jsonb_agg(to_jsonb(o) ORDER BY o.id)::text,'[]')) FROM public.question_options o WHERE o.question_id=q.id) AS options_hash
    FROM public.questions q WHERE q.subtest_id=${quote(subtest)}::uuid ORDER BY q.id`)
}

const before = await snapshot()
const existing = before.filter(row => row.collection === collection)
const manifestPath = `${dir}/publication-manifest.json`
let manifest
if (existsSync(manifestPath)) {
  manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  assert.equal(manifest.sourceHash, sourceHash, 'Source changed after manifest preparation')
  assert.equal(manifest.subtest, subtest)
} else {
  assert.equal(existing.length, 0, 'Existing collection requires its original manifest')
  const order = Math.max(0, ...before.map(row => row.sort_order ?? 0)) + 1
  manifest = { sourceHash, collection, subtest, questions: [], options: [] }
  for (const item of bank) {
    const id = randomUUID()
    // Explicit image dimensions preserve readable labels in the existing image renderer.
    const svg = item.svg.replace('<svg ', '<svg width="510" height="382" style="color:#172332;font-family:Arial,Helvetica,sans-serif" ')
      .replace(/(<svg[^>]*>)/, '$1<rect width="510" height="382" fill="white"/>')
    manifest.questions.push({
      id, subtest_id: subtest, stimulus_id: null, kind: 'single_best_answer', topic: 'Venn Diagrams',
      stem: item.prompt,
      data: {
        source_id: `VD89-Q${String(item.id).padStart(2, '0')}`,
        source_collection: collection,
        source_title: `Venn diagram question ${item.id}`,
        reasoning_family: 'Venn Diagrams',
        passage: item.intro,
        images: [`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`],
      },
      explanation_text: item.explanation,
      difficulty: ['both_inclusive', 'one_exclude', 'exactly_one', 'at_least_one', 'neither_two'].includes(item.kind) ? 'easy' : 'medium',
      sort_order: order + item.id - 1, published: true, tags: ['Venn Diagrams'],
    })
    item.options.forEach((value, index) => manifest.options.push({ id: randomUUID(), question_id: id, label: 'ABCD'[index], body: String(value), is_correct: index === item.correct, sort_order: index + 1 }))
  }
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
}
assert.equal(manifest.questions.length, 89)
assert.equal(manifest.options.length, 356)
const preflight = { checkedAt: new Date().toISOString(), sourceHash, collection, totalDecisionMakingBefore: before.length, publishedVennBefore: before.filter(row => row.published && row.tags?.includes('Venn Diagrams')).length, alreadyPresent: existing.length, newQuestions: 89, newOptions: 356, diagrams: 89, calculationsValidated: true }
writeFileSync(`${dir}/preflight.json`, JSON.stringify(preflight, null, 2) + '\n')
console.log(JSON.stringify({ stage: 'preflight', ...preflight }))
if (!process.argv.includes('--publish')) process.exit(0)

assert.ok(existing.length === 0 || existing.length === 89, 'Partial existing collection requires audit')
if (!existing.length) {
  writeFileSync(`${dir}/bank-before.json`, JSON.stringify(before, null, 2) + '\n')
  const query = `DO $import$ BEGIN
    PERFORM pg_advisory_xact_lock(hashtext(${quote(collection)}));
    IF EXISTS (SELECT 1 FROM public.questions WHERE data->>'source_collection'=${quote(collection)} OR data->>'source_id' = ANY(ARRAY[${manifest.questions.map(row => quote(row.data.source_id)).join(',')}])) THEN RAISE EXCEPTION 'Collection already present'; END IF;
    INSERT INTO public.questions (id,subtest_id,stimulus_id,kind,topic,stem,data,explanation_text,difficulty,sort_order,published,tags)
    SELECT id,subtest_id,stimulus_id,kind::public.question_kind,topic,stem,data,explanation_text,difficulty,sort_order,published,tags
    FROM jsonb_to_recordset(${quote(JSON.stringify(manifest.questions))}::jsonb)
    AS x(id uuid,subtest_id uuid,stimulus_id uuid,kind text,topic text,stem text,data jsonb,explanation_text text,difficulty text,sort_order integer,published boolean,tags text[]);
    INSERT INTO public.question_options (id,question_id,label,body,is_correct,sort_order)
    SELECT id,question_id,label,body,is_correct,sort_order
    FROM jsonb_to_recordset(${quote(JSON.stringify(manifest.options))}::jsonb)
    AS o(id uuid,question_id uuid,label text,body text,is_correct boolean,sort_order integer);
  END $import$;`
  await sql(query, false)
}

const stored = await sql(`SELECT q.*, (SELECT jsonb_agg(to_jsonb(o) ORDER BY o.sort_order) FROM public.question_options o WHERE o.question_id=q.id) AS options FROM public.questions q WHERE q.data->>'source_collection'=${quote(collection)} ORDER BY q.sort_order`)
assert.equal(stored.length, 89)
for (const expected of manifest.questions) {
  const actual = stored.find(row => row.id === expected.id)
  assert.ok(actual)
  for (const [key, value] of Object.entries(expected)) assert.deepEqual(actual[key], value, `${expected.data.source_id}.${key}`)
  assert.equal(actual.options.length, 4)
  assert.equal(actual.options.filter(option => option.is_correct).length, 1)
  for (const option of manifest.options.filter(row => row.question_id === actual.id)) {
    const actualOption = actual.options.find(row => row.id === option.id)
    assert.ok(actualOption)
    for (const [key, value] of Object.entries(option)) assert.deepEqual(actualOption[key], value)
  }
}
const after = await snapshot()
for (const old of before.filter(row => row.collection !== collection)) {
  const actual = after.find(row => row.id === old.id)
  assert.ok(actual, 'Existing question disappeared during import')
  assert.equal(actual.question_hash, old.question_hash, 'Existing question content changed during import')
  assert.equal(actual.options_hash, old.options_hash, 'Existing options changed during import')
}
assert.equal(after.filter(row => row.collection === collection).length, 89)
writeFileSync(`${dir}/published-questions.json`, JSON.stringify(stored, null, 2) + '\n')
const verification = { verifiedAt: new Date().toISOString(), collection, sourceHash, publishedQuestions: 89, options: 356, diagrams: 89, explanations: 89, allStoredContentMatches: true, existingQuestionsPreserved: true, totalDecisionMakingAfter: after.length, publishedVennAfter: after.filter(row => row.published && row.tags?.includes('Venn Diagrams')).length, alreadyPresent: existing.length === 89, url: `${APP}/practice/ucat/decision-making` }
writeFileSync(`${dir}/publication-verification.json`, JSON.stringify(verification, null, 2) + '\n')
console.log(JSON.stringify(verification))
