import assert from 'node:assert/strict'
import {readFileSync,writeFileSync,existsSync} from 'node:fs'
import {randomUUID} from 'node:crypto'
import {clients,sql,q} from './lib/interview-operator.mjs'
const dir='artifacts/qr-sample-upload',source='../output/ucat-qr-sample-01',subtest='86a52ac4-f2b9-40b8-997b-5e44de337f92'
const content=JSON.parse(readFileSync(`${source}/sample-set.json`));assert.equal(content.question_count,16)
const {admin}=await clients()
async function fetchBank(){const all=[];for(let start=0;;start+=500){const {data,error}=await admin.from('questions').select('*, options:question_options(*), stimulus:stimuli(*)').eq('subtest_id',subtest).order('id').range(start,start+499);if(error)throw Error(error.message);all.push(...data);if(data.length<500)return all}}
const bank=await fetchBank();const identifiers=content.sets.flatMap(s=>s.questions.map(v=>v.id));const existing=bank.filter(r=>identifiers.includes(r.data?.source_id))
let payload
if(existing.length){assert.equal(existing.length,16,'Partial existing sample must be audited');assert.ok(existsSync(`${dir}/manifest.json`),'Existing sample needs verification against its upload manifest');payload=JSON.parse(readFileSync(`${dir}/manifest.json`))}
else{
 for(const item of content.sets.flatMap(s=>s.questions))assert.ok(!bank.some(r=>r.stem===item.stem),'A question with the same stem is already present')
 writeFileSync(`${dir}/bank-before.json`,JSON.stringify(bank,null,2)+'\n')
 payload={stimuli:[],questions:[],options:[]}
 const order=Math.max(0,...bank.map(r=>r.sort_order??0))+1
 for(const [i,set] of content.sets.entries()){
  const stimulus_id=randomUUID(),data={passage:set.passage,source_key:set.key}
  if(set.tables)data.tables=set.tables
  if(set.diagram){data.images=['data:image/svg+xml;base64,'+readFileSync(`${source}/diagrams/${set.diagram}.svg`).toString('base64')];data.image_descriptions=[set.alt]}
  payload.stimuli.push({id:stimulus_id,subtest_id:subtest,title:`Studocyte QR Sample Set #1: ${set.title}`,data,sort_order:order+i})
  for(const item of set.questions){
   const id=randomUUID()
   payload.questions.push({id,subtest_id:subtest,stimulus_id,kind:'single_best_answer',topic:null,stem:item.stem,data:{source_id:item.id,source_set:set.key,source_title:set.title},explanation_text:item.explanation,difficulty:item.difficulty,sort_order:order+item.number-1,published:true,tags:[set.tag]})
   for(const [label,body] of Object.entries(item.options))payload.options.push({id:randomUUID(),question_id:id,label,body,is_correct:label===item.correct,sort_order:'ABCDE'.indexOf(label)+1})
  }
 }
 assert.equal(payload.stimuli.length,4);assert.equal(payload.questions.length,16);assert.equal(payload.options.length,80)
 writeFileSync(`${dir}/manifest.json`,JSON.stringify(payload,null,2)+'\n')
 const query=`DO $import$ BEGIN
 PERFORM pg_advisory_xact_lock(hashtext('studocyte-qr-approved-sample-01'));
 IF EXISTS (SELECT 1 FROM public.questions WHERE data->>'source_id' = ANY(ARRAY[${identifiers.map(q).join(',')}])) THEN RAISE EXCEPTION 'Sample appeared concurrently'; END IF;
 INSERT INTO public.stimuli (id,subtest_id,title,data,sort_order) SELECT id,subtest_id,title,data,sort_order FROM jsonb_to_recordset(${q(JSON.stringify(payload.stimuli))}::jsonb) AS s(id uuid,subtest_id uuid,title text,data jsonb,sort_order integer);
 INSERT INTO public.questions (id,subtest_id,stimulus_id,kind,topic,stem,data,explanation_text,difficulty,sort_order,published,tags) SELECT id,subtest_id,stimulus_id,kind::public.question_kind,topic,stem,data,explanation_text,difficulty,sort_order,published,tags FROM jsonb_to_recordset(${q(JSON.stringify(payload.questions))}::jsonb) AS x(id uuid,subtest_id uuid,stimulus_id uuid,kind text,topic text,stem text,data jsonb,explanation_text text,difficulty text,sort_order integer,published boolean,tags text[]);
 INSERT INTO public.question_options (id,question_id,label,body,is_correct,sort_order) SELECT id,question_id,label,body,is_correct,sort_order FROM jsonb_to_recordset(${q(JSON.stringify(payload.options))}::jsonb) AS o(id uuid,question_id uuid,label text,body text,is_correct boolean,sort_order integer);
 END $import$;`
 await sql(query,false)
}
const after=await fetchBank(),sample=after.filter(r=>identifiers.includes(r.data?.source_id));assert.equal(sample.length,16)
for(const expected of payload.questions){const actual=sample.find(r=>r.id===expected.id);assert.ok(actual);for(const [key,val]of Object.entries(expected))assert.deepEqual(actual[key],val,`${expected.data.source_id}.${key}`);const stim=payload.stimuli.find(s=>s.id===actual.stimulus_id);for(const [key,val]of Object.entries(stim))assert.deepEqual(actual.stimulus[key],val);const options=payload.options.filter(o=>o.question_id===actual.id);assert.equal(actual.options.length,5);for(const option of options){const stored=actual.options.find(o=>o.id===option.id);for(const[key,val]of Object.entries(option))assert.deepEqual(stored[key],val)}}
const normalize=r=>({...r,options:[...r.options].sort((a,b)=>a.id.localeCompare(b.id))})
for(const old of bank.filter(r=>!identifiers.includes(r.data?.source_id)))assert.deepEqual(normalize(after.find(r=>r.id===old.id)),normalize(old),'Existing bank content changed')
writeFileSync(`${dir}/published-questions.json`,JSON.stringify(sample,null,2)+'\n')
const result={verifiedAt:new Date().toISOString(),publishedQuestions:16,sets:4,options:80,diagrams:2,allExplanationsMatch:true,existingQuestionsPreserved:true,totalQRQuestions:after.length,alreadyPresent:existing.length>0}
writeFileSync(`${dir}/verification.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result))
