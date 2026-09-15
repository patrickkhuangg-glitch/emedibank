import assert from 'node:assert/strict'
import {readFileSync,writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {clients,sql,q,vercel,team,vercelProject} from './lib/interview-operator.mjs'
const dir='artifacts/qr-exclusive-mocks-release',source='../output/ucat-qr-fresh-mocks-02-08'
const read=p=>JSON.parse(readFileSync(p)),payload=read(`${source}/import-manifest.json`),audit=read(`${source}/platform-audit.json`)
assert.equal(audit.status,'passed')
for(const [file,key]of [['collection.json','content_sha256'],['import-manifest.json','manifest_sha256']])assert.equal(createHash('sha256').update(readFileSync(`${source}/${file}`)).digest('hex'),audit[key],`Audited ${file} changed`)
assert.equal(payload.questions.length,252);assert.equal(payload.options.length,1260);assert.equal(payload.stimuli.length,105);assert.equal(payload.assignments.length,252)
const release=read(`${dir}/release.json`),deployment=await vercel(`/v13/deployments/${release.id}?teamId=${team}`),project=await vercel(`/v9/projects/${vercelProject}?teamId=${team}`)
assert.equal(deployment.readyState,'READY','Practice restrictions must finish deployment before content import')
assert.equal(project.targets.production.id,release.id,'Verify the currently deployed practice restrictions before importing')
const {admin}=await clients(),subtest=payload.questions[0].subtest_id,exam=payload.assignments[0].exam_id,keys=[...new Set(payload.assignments.map(a=>a.mock_key))],ids=new Set(payload.questions.map(q=>q.id))
async function get(query){const{data,error}=await query;if(error)throw Error(error.message);return data}
async function bank(){const all=[];for(let start=0;;start+=500){const page=await get(admin.from('questions').select('*,options:question_options(*),stimulus:stimuli(*)').eq('subtest_id',subtest).order('id').range(start,start+499));all.push(...page);if(page.length<500)return all}}
const before=await bank(),assignedBefore=await get(admin.from('mock_question_assignments').select('*').eq('subtest_id',subtest).order('sort_order'))
const existing=before.filter(q=>ids.has(q.id))
assert.equal(new Set(payload.assignments.map(a=>a.question_id)).size,252)
for(const item of payload.questions){assert.equal(item.data.mock_only,true);assert(keys.includes(item.data.mock_key));assert.equal(payload.assignments.find(a=>a.question_id===item.id).mock_key,item.data.mock_key)}
for(const key of keys){const rows=payload.assignments.filter(a=>a.mock_key===key);assert.equal(rows.length,36);const groups=new Map();for(const a of rows){const item=payload.questions.find(q=>q.id===a.question_id);groups.set(item.stimulus_id,(groups.get(item.stimulus_id)??0)+1)}assert.deepEqual([...groups.values()],[4,4,4,4,4,4,4,1,1,1,1,1,1,1,1])}
if(existing.length)assert.equal(existing.length,252,'Partial collection needs recovery before retry')
else{
 assert.equal(assignedBefore.filter(a=>keys.includes(a.mock_key)).length,0,'New form keys already have assignments')
 writeFileSync(`${dir}/bank-before-publish.json`,JSON.stringify(before,null,2));writeFileSync(`${dir}/assignments-before-publish.json`,JSON.stringify(assignedBefore,null,2))
 const query=`DO $import$ BEGIN
 PERFORM pg_advisory_xact_lock(hashtext('studocyte-qr-exclusive-mocks-02-08'));
 IF EXISTS(SELECT 1 FROM public.questions WHERE data->>'source_collection'='STUDOCYTE-QR-EXCLUSIVE-02-08') OR EXISTS(SELECT 1 FROM public.mock_question_assignments WHERE exam_id=${q(exam)}::uuid AND mock_key=ANY(ARRAY[${keys.map(q).join(',')}])) THEN RAISE EXCEPTION 'Collection or assignment appeared concurrently'; END IF;
 INSERT INTO public.stimuli(id,subtest_id,title,data,sort_order) SELECT id,subtest_id,title,data,sort_order FROM jsonb_to_recordset(${q(JSON.stringify(payload.stimuli))}::jsonb) AS s(id uuid,subtest_id uuid,title text,data jsonb,sort_order integer);
 INSERT INTO public.questions(id,subtest_id,stimulus_id,kind,topic,stem,data,explanation_text,difficulty,sort_order,published,tags) SELECT id,subtest_id,stimulus_id,kind::public.question_kind,topic,stem,data,explanation_text,difficulty,sort_order,published,tags FROM jsonb_to_recordset(${q(JSON.stringify(payload.questions))}::jsonb) AS x(id uuid,subtest_id uuid,stimulus_id uuid,kind text,topic text,stem text,data jsonb,explanation_text text,difficulty text,sort_order integer,published boolean,tags text[]);
 INSERT INTO public.question_options(id,question_id,label,body,is_correct,sort_order) SELECT id,question_id,label,body,is_correct,sort_order FROM jsonb_to_recordset(${q(JSON.stringify(payload.options))}::jsonb) AS o(id uuid,question_id uuid,label text,body text,is_correct boolean,sort_order integer);
 INSERT INTO public.mock_question_assignments(exam_id,subtest_id,mock_key,question_id,sort_order) SELECT exam_id,subtest_id,mock_key,question_id,sort_order FROM jsonb_to_recordset(${q(JSON.stringify(payload.assignments))}::jsonb) AS a(exam_id uuid,subtest_id uuid,mock_key text,question_id uuid,sort_order integer);
 END $import$;`
 await sql(query,false)
}
const after=await bank(),assignments=await get(admin.from('mock_question_assignments').select('*').eq('subtest_id',subtest).order('sort_order'))
for(const expected of payload.questions){const actual=after.find(q=>q.id===expected.id);assert(actual);for(const[k,v]of Object.entries(expected))assert.deepEqual(actual[k],v,`${expected.id}.${k}`);const stimulus=payload.stimuli.find(s=>s.id===expected.stimulus_id);for(const[k,v]of Object.entries(stimulus))assert.deepEqual(actual.stimulus[k],v);const options=payload.options.filter(o=>o.question_id===expected.id);assert.equal(actual.options.length,5);for(const option of options){const stored=actual.options.find(o=>o.id===option.id);for(const[k,v]of Object.entries(option))assert.deepEqual(stored[k],v)}}
const normalize=r=>({...r,options:[...r.options].sort((a,b)=>a.id.localeCompare(b.id))})
const original=existing.length?read(`${dir}/bank-before-publish.json`):before
for(const old of original)assert.deepEqual(normalize(after.find(q=>q.id===old.id)),normalize(old),'Existing question bank changed')
const oldAssignments=existing.length?read(`${dir}/assignments-before-publish.json`):assignedBefore
for(const row of oldAssignments)assert.deepEqual(assignments.find(a=>a.id===row.id),row,'Existing mock assignment changed')
for(const expected of payload.assignments){const actual=assignments.find(a=>a.mock_key===expected.mock_key&&a.question_id===expected.question_id);assert(actual);for(const[k,v]of Object.entries(expected))assert.deepEqual(actual[k],v)}
assert.equal(assignments.filter(a=>keys.includes(a.mock_key)).length,252)
const practice=await admin.from('questions').select('id',{count:'exact',head:true}).eq('subtest_id',subtest).eq('published',true).or('data->>mock_only.is.null,data->>mock_only.neq.true');if(practice.error)throw Error(practice.error.message)
assert.equal(practice.count,original.filter(q=>q.published&&q.data?.mock_only!==true).length)
const result={published:true,verifiedAt:new Date().toISOString(),deployment:release.id,mocks:keys.length,newQuestions:252,options:1260,fullSets:49,standaloneSets:56,questionsPerMock:36,minutesPerMock:26,practiceBankQuestions:practice.count,existingBankPreserved:true,existingMockAssignmentsPreserved:true,newQuestionOverlap:0,allStoredContentMatches:true}
writeFileSync(`${dir}/published-questions.json`,JSON.stringify(after.filter(q=>ids.has(q.id)),null,2));writeFileSync(`${dir}/verification.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result))
