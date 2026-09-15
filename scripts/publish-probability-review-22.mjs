import assert from 'node:assert/strict'
import {createHash,randomUUID} from 'node:crypto'
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs'
import {sql,q} from './lib/interview-operator.mjs'

const source='../output/ucat-probability-review',dir='artifacts/probability-review-22-release'
const collection='ucat-dm-probability-review-22-2026-09-09'
const reserveKey='reserved-full-mock-dm-probability-1'
const reserve=[1,5,7,12,16,18]
const raw=readFileSync(`${source}/questions.json`,'utf8'),items=JSON.parse(raw)
const hash=createHash('sha256').update(raw).digest('hex')
const audit=JSON.parse(readFileSync(`${source}/validation.json`,'utf8'))
assert.equal(audit.source_sha256,hash);assert.equal(items.length,22)
for(const item of items){
 assert.equal(item.options.length,4);assert.equal(item.option_explanations.length,4)
 assert.equal(new Set(item.options).size,4);assert.ok(Number.isInteger(item.correct)&&item.correct>=0&&item.correct<4)
 if(item.visual)assert.ok(item.visual.startsWith('<svg')&&!/<script|<foreignObject|\bon\w+\s*=|(?:href|src)\s*=/i.test(item.visual))
}
mkdirSync(dir,{recursive:true})
const [sub]=await sql(`SELECT s.id,s.exam_id FROM subtests s JOIN exams e ON e.id=s.exam_id WHERE e.name='UCAT' AND s.name='Decision Making'`)
assert.ok(sub)
async function snapshot(){return sql(`SELECT t.id,md5(to_jsonb(t)::text) AS hash,(SELECT md5(coalesce(jsonb_agg(to_jsonb(o) ORDER BY o.id)::text,'[]')) FROM question_options o WHERE o.question_id=t.id) AS options_hash FROM questions t WHERE subtest_id=${q(sub.id)}::uuid ORDER BY id`)}
const before=await snapshot()
const assignmentsBefore=await sql('SELECT * FROM mock_question_assignments ORDER BY id')
const existing=await sql(`SELECT id FROM questions WHERE data->>'source_collection'=${q(collection)}`)
assert.ok(existing.length===0||existing.length===22,'Partial import requires inspection')
let manifest
if(existsSync(`${dir}/manifest.json`)){
 manifest=JSON.parse(readFileSync(`${dir}/manifest.json`,'utf8'));assert.equal(manifest.sourceHash,hash)
}else{
 assert.equal(existing.length,0)
 const [max]=await sql(`SELECT coalesce(max(sort_order),0)::int AS n FROM questions WHERE subtest_id=${q(sub.id)}::uuid`)
 manifest={collection,sourceHash:hash,reserveKey,reservedSourceQuestions:reserve,questions:[],options:[],assignments:[]}
 for(const item of items){
  const id=randomUUID(),reserved=reserve.includes(item.id)
  manifest.questions.push({id,subtest_id:sub.id,stimulus_id:null,kind:'single_best_answer',topic:'Probability',stem:item.stem,
   data:{source_id:`${collection}-q${item.id}`,source_collection:collection,source_question_number:item.id,source_title:`Probability: ${item.family}`,reasoning_family:item.family,passage:item.passage,mock_only:reserved,...(reserved?{mock_key:reserveKey,reservation_status:'reserved_for_full_mock',reservation_order:reserve.indexOf(item.id)+1}:{}),...(item.visual?{images:[`data:image/svg+xml;base64,${Buffer.from(item.visual).toString('base64')}`]}:{})},
   explanation_text:`Correct answer: ${'ABCD'[item.correct]}.\n\n${item.explanation}\n\n${item.option_explanations.map((x,i)=>`${'ABCD'[i]}. ${x}`).join('\n\n')}`,
   difficulty:[7,9,10,11,13,21].includes(item.id)?'hard':[1,3,6,14,17,22].includes(item.id)?'easy':'medium',sort_order:max.n+item.id,published:!reserved,tags:['Probability']})
  item.options.forEach((body,i)=>manifest.options.push({id:randomUUID(),question_id:id,label:'ABCD'[i],body,is_correct:i===item.correct,sort_order:i+1}))
  if(reserved)manifest.assignments.push({exam_id:sub.exam_id,subtest_id:sub.id,mock_key:reserveKey,question_id:id,sort_order:reserve.indexOf(item.id)+1})
 }
 writeFileSync(`${dir}/manifest.json`,JSON.stringify(manifest,null,2))
}
assert.equal(manifest.questions.filter(x=>x.published&&!x.data.mock_only).length,16)
assert.equal(manifest.questions.filter(x=>!x.published&&x.data.mock_only).length,6)
assert.equal(manifest.assignments.length,6);assert.equal(manifest.options.length,88)
console.log(JSON.stringify({stage:'prepared',practiceQuestions:16,reservedMockQuestions:6,reservedSourceQuestions:reserve,alreadyPresent:existing.length}))
if(!process.argv.includes('--publish'))process.exit(0)
if(!existing.length){
 writeFileSync(`${dir}/bank-before.json`,JSON.stringify(before,null,2))
 writeFileSync(`${dir}/assignments-before.json`,JSON.stringify(assignmentsBefore,null,2))
 await sql(`DO $upload$ BEGIN
 PERFORM pg_advisory_xact_lock(hashtext(${q(collection)}));
 IF EXISTS(SELECT 1 FROM questions WHERE data->>'source_collection'=${q(collection)}) OR EXISTS(SELECT 1 FROM mock_question_assignments WHERE mock_key=${q(reserveKey)}) THEN RAISE EXCEPTION 'Collection or reserve already exists'; END IF;
 INSERT INTO questions(id,subtest_id,stimulus_id,kind,topic,stem,data,explanation_text,difficulty,sort_order,published,tags)
 SELECT id,subtest_id,stimulus_id,kind::public.question_kind,topic,stem,data,explanation_text,difficulty,sort_order,published,tags FROM jsonb_to_recordset(${q(JSON.stringify(manifest.questions))}::jsonb) AS x(id uuid,subtest_id uuid,stimulus_id uuid,kind text,topic text,stem text,data jsonb,explanation_text text,difficulty text,sort_order integer,published boolean,tags text[]);
 INSERT INTO question_options(id,question_id,label,body,is_correct,sort_order) SELECT id,question_id,label,body,is_correct,sort_order FROM jsonb_to_recordset(${q(JSON.stringify(manifest.options))}::jsonb) AS x(id uuid,question_id uuid,label text,body text,is_correct boolean,sort_order integer);
 INSERT INTO mock_question_assignments(exam_id,subtest_id,mock_key,question_id,sort_order) SELECT exam_id,subtest_id,mock_key,question_id,sort_order FROM jsonb_to_recordset(${q(JSON.stringify(manifest.assignments))}::jsonb) AS x(exam_id uuid,subtest_id uuid,mock_key text,question_id uuid,sort_order integer);
 END $upload$;`,false)
}
const stored=await sql(`SELECT t.*,(SELECT jsonb_agg(to_jsonb(o) ORDER BY o.sort_order) FROM question_options o WHERE o.question_id=t.id) AS options FROM questions t WHERE data->>'source_collection'=${q(collection)} ORDER BY sort_order`)
assert.equal(stored.length,22)
for(const expected of manifest.questions){
 const actual=stored.find(x=>x.id===expected.id);assert.ok(actual)
 for(const[k,v]of Object.entries(expected))assert.deepEqual(actual[k],v,`${expected.id}.${k}`)
 assert.equal(actual.options.length,4);assert.equal(actual.options.filter(x=>x.is_correct).length,1)
 for(const o of manifest.options.filter(x=>x.question_id===expected.id))for(const[k,v]of Object.entries(o))assert.deepEqual(actual.options.find(x=>x.id===o.id)[k],v)
}
const after=await snapshot(),assigned=await sql('SELECT * FROM mock_question_assignments ORDER BY id')
const original=JSON.parse(readFileSync(`${dir}/bank-before.json`,'utf8'))
for(const row of original)assert.deepEqual(after.find(x=>x.id===row.id),row,'Existing content changed')
for(const row of JSON.parse(readFileSync(`${dir}/assignments-before.json`,'utf8')))assert.deepEqual(assigned.find(x=>x.id===row.id),row,'Existing assignments changed')
for(const row of manifest.assignments){const actual=assigned.find(x=>x.question_id===row.question_id&&x.mock_key===row.mock_key);assert.ok(actual);for(const[k,v]of Object.entries(row))assert.deepEqual(actual[k],v)}
const [counts]=await sql(`SELECT count(*) FILTER(WHERE published AND coalesce(data->>'mock_only','false')<>'true')::int AS practice,count(*) FILTER(WHERE NOT published AND data->>'mock_only'='true')::int AS reserved FROM questions WHERE data->>'source_collection'=${q(collection)}`)
assert.deepEqual(counts,{practice:16,reserved:6})
const result={verifiedAt:new Date().toISOString(),sourceHash:hash,uploaded:22,publishedPractice:16,reservedFullMock:6,reservedSourceQuestions:reserve,reserveKey,options:88,allStoredContentMatches:true,existingContentPreserved:true,existingAssignmentsPreserved:true}
writeFileSync(`${dir}/verification.json`,JSON.stringify(result,null,2))
writeFileSync(`${dir}/published-questions.json`,JSON.stringify(stored,null,2))
writeFileSync(`${source}/upload-status.json`,JSON.stringify(result,null,2))
console.log(JSON.stringify(result))
