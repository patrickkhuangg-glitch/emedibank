import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { sql, q as quote, APP } from './lib/interview-operator.mjs'
const source = fileURLToPath(new URL('../../output/ucat-venn-147/', import.meta.url))
const dir = fileURLToPath(new URL('../artifacts/venn-147-extension/', import.meta.url))
mkdirSync(dir, { recursive: true })
const collection = 'ucat-dm-varied-venn-147-extension-2026-09-09'
const raw = readFileSync(`${source}/questions.json`, 'utf8')
const sourceHash = createHash('sha256').update(raw).digest('hex')
const items = JSON.parse(raw)
const audit = JSON.parse(readFileSync(`${source}/independent-audit.json`, 'utf8'))
assert.equal(audit.source_sha256, sourceHash)
assert.equal(audit.question_count, 147)
assert.equal(audit.all_answers_unique, true)
assert.equal(audit.matching_options_checked, 196)
assert.equal(audit.rendered_numeric_regions_checked, 1808)
assert.equal(items.length, 147)
assert.equal(new Set(items.map(x => x.source_id)).size, 147)
const families = Object.fromEntries(['Construct from information', 'Match a diagram', 'Identify a marked region', 'Count across different shapes'].map(f => [f, items.filter(x => x.family === f).length]))
assert.deepEqual(Object.values(families), [49,49,25,24])
for (const item of items) {
  assert.equal(item.options.length, 4)
  assert.equal(new Set(item.options).size, 4)
  assert.ok(Number.isInteger(item.correct) && item.correct >= 0 && item.correct <= 3)
  assert.ok(item.passage && item.stem && item.explanation)
  assert.equal(item.images.length, item.family === 'Construct from information' ? 0 : 1)
  for (const svg of item.images) {
    assert.ok(svg.startsWith('<svg '))
    assert.ok(!/<script|<foreignObject|\bon\w+\s*=|(?:href|src)\s*=/i.test(svg))
  }
}
const subtests = await sql(`SELECT s.id FROM public.subtests s JOIN public.exams e ON e.id=s.exam_id WHERE e.name='UCAT' AND s.name='Decision Making'`)
assert.equal(subtests.length,1)
const subtest = subtests[0].id
async function snapshot() {
  return sql(`SELECT q.id,q.sort_order,q.published,q.tags,q.data->>'source_collection' AS collection,
    md5(to_jsonb(q)::text) AS full_hash,
    (SELECT md5(coalesce(jsonb_agg(to_jsonb(o) ORDER BY o.id)::text,'[]')) FROM public.question_options o WHERE o.question_id=q.id) AS options_hash
    FROM public.questions q WHERE q.subtest_id=${quote(subtest)}::uuid ORDER BY q.id`)
}
const before = await snapshot()
const existing = before.filter(x => x.collection === collection)
assert.ok(existing.length === 0 || existing.length === 147, 'Partial collection requires audit')
const publishedVennBefore = before.filter(x => x.published && x.tags?.includes('Venn Diagrams')).length
assert.equal(publishedVennBefore, existing.length ? 347 : 200)
const manifestPath = `${dir}/manifest.json`
let manifest
if (existsSync(manifestPath)) {
  manifest = JSON.parse(readFileSync(manifestPath,'utf8'))
  assert.equal(manifest.sourceHash,sourceHash)
  assert.equal(manifest.subtest,subtest)
  assert.equal(manifest.collection,collection)
} else {
  assert.equal(existing.length,0)
  manifest = {collection,sourceHash,subtest,questions:[],options:[]}
  const order = Math.max(...before.map(x => x.sort_order ?? 0))
  for (const item of items) {
    const id = randomUUID()
    const images = item.images.map(svg => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`)
    manifest.questions.push({id,subtest_id:subtest,stimulus_id:null,kind:'single_best_answer',topic:'Venn Diagrams',stem:item.stem,
      data:{source_id:item.source_id,source_collection:collection,source_title:`Venn diagrams: ${item.family.toLowerCase()} ${item.id}`,reasoning_family:item.family,passage:item.passage,...(images.length ? {images} : {})},
      explanation_text:item.explanation,difficulty:item.difficulty,sort_order:order+item.id,published:true,tags:['Venn Diagrams']})
    item.options.forEach((body,i) => manifest.options.push({id:randomUUID(),question_id:id,label:'ABCD'[i],body,is_correct:i===item.correct,sort_order:i+1}))
  }
  writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n')
}
assert.equal(manifest.questions.length,147)
assert.equal(manifest.options.length,588)
const preflight = {checkedAt:new Date().toISOString(),sourceHash,existingVenn:publishedVennBefore,add:147,finalPublishedVenn:347,families,alreadyPresent:existing.length===147}
writeFileSync(`${dir}/preflight.json`,JSON.stringify(preflight,null,2)+'\n')
console.log(JSON.stringify({stage:'preflight',...preflight}))
if (!process.argv.includes('--publish')) process.exit(0)
if (!existing.length) {
  writeFileSync(`${dir}/bank-before.json`,JSON.stringify(before,null,2)+'\n')
  await sql(`DO $extension$ BEGIN
    PERFORM pg_advisory_xact_lock(hashtext(${quote(collection)}));
    IF EXISTS (SELECT 1 FROM public.questions WHERE data->>'source_collection'=${quote(collection)} OR data->>'source_id'=ANY(ARRAY[${items.map(x=>quote(x.source_id)).join(',')}])) THEN RAISE EXCEPTION 'Extension already present'; END IF;
    IF (SELECT count(*) FROM public.questions WHERE subtest_id=${quote(subtest)}::uuid AND published AND tags @> ARRAY['Venn Diagrams']::text[]) <> 200 THEN RAISE EXCEPTION 'Live Venn count changed'; END IF;
    INSERT INTO public.questions (id,subtest_id,stimulus_id,kind,topic,stem,data,explanation_text,difficulty,sort_order,published,tags)
    SELECT id,subtest_id,stimulus_id,kind::public.question_kind,topic,stem,data,explanation_text,difficulty,sort_order,published,tags
    FROM jsonb_to_recordset(${quote(JSON.stringify(manifest.questions))}::jsonb)
    AS x(id uuid,subtest_id uuid,stimulus_id uuid,kind text,topic text,stem text,data jsonb,explanation_text text,difficulty text,sort_order integer,published boolean,tags text[]);
    INSERT INTO public.question_options (id,question_id,label,body,is_correct,sort_order)
    SELECT id,question_id,label,body,is_correct,sort_order FROM jsonb_to_recordset(${quote(JSON.stringify(manifest.options))}::jsonb)
    AS o(id uuid,question_id uuid,label text,body text,is_correct boolean,sort_order integer);
    IF (SELECT count(*) FROM public.questions WHERE subtest_id=${quote(subtest)}::uuid AND published AND tags @> ARRAY['Venn Diagrams']::text[]) <> 347 THEN RAISE EXCEPTION 'Final Venn count is not 347'; END IF;
  END $extension$;`,false)
}
const stored = await sql(`SELECT q.*, (SELECT jsonb_agg(to_jsonb(o) ORDER BY o.sort_order) FROM public.question_options o WHERE o.question_id=q.id) AS options FROM public.questions q WHERE q.data->>'source_collection'=${quote(collection)} ORDER BY q.sort_order`)
assert.equal(stored.length,147)
for (const expected of manifest.questions) {
  const actual = stored.find(x => x.id === expected.id)
  assert.ok(actual)
  for (const [key,value] of Object.entries(expected)) assert.deepEqual(actual[key],value,`${expected.data.source_id}.${key}`)
  assert.equal(actual.options.length,4)
  assert.equal(actual.options.filter(x=>x.is_correct).length,1)
  for (const option of manifest.options.filter(x=>x.question_id===actual.id)) {
    const actualOption = actual.options.find(x=>x.id===option.id)
    assert.ok(actualOption)
    for (const [key,value] of Object.entries(option)) assert.deepEqual(actualOption[key],value)
  }
}
const after = await snapshot()
for (const old of before.filter(x=>x.collection!==collection)) {
  const current = after.find(x=>x.id===old.id)
  assert.ok(current)
  assert.equal(current.full_hash,old.full_hash)
  assert.equal(current.options_hash,old.options_hash)
}
assert.equal(after.filter(x=>x.published && x.tags?.includes('Venn Diagrams')).length,347)
writeFileSync(`${dir}/published-questions.json`,JSON.stringify(stored,null,2)+'\n')
const result = {verifiedAt:new Date().toISOString(),sourceHash,publishedVennQuestions:347,addedQuestions:147,newOptions:588,allContentMatches:true,allExistingQuestionsAndOptionsPreserved:true,families,url:`${APP}/practice/ucat/decision-making`}
writeFileSync(`${dir}/verification.json`,JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify(result))
