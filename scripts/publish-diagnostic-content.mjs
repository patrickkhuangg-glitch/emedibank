import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {sql,q,clients} from './lib/interview-operator.mjs';
const dir='artifacts/diagnostic-release',p=JSON.parse(readFileSync(`${dir}/import.json`));
assert.equal(p.questions.length,184);assert.equal(p.assignments.length,184);assert.equal(new Set(p.questions.map(x=>x.id)).size,184);
const {admin}=await clients();async function get(query){const {data,error}=await query;if(error)throw Error(error.message);return data;}
async function assignments(){const rows=[];for(let offset=0;;offset+=500){const batch=await get(admin.from('mock_question_assignments').select('*').eq('exam_id',p.assignments[0].exam_id).order('id').range(offset,offset+499));rows.push(...batch);if(batch.length<500)return rows}}
async function byIds(table,columns,ids){const rows=[];for(let i=0;i<ids.length;i+=100)rows.push(...await get(admin.from(table).select(columns).in('id',ids.slice(i,i+100))));return rows}
const before=await assignments();
const existing=before.filter(r=>r.mock_key==='diagnostic-1');
if(!existing.length){
 writeFileSync(`${dir}/assignments-before.json`,JSON.stringify(before));
 for(const key of ['questions','stimuli','options']){
  const table=key==='options'?'question_options':key;
  const rows=await byIds(table,'id',p[key].map(r=>r.id));assert.equal(rows.length,0,'Diagnostic IDs already exist');
 }
 await sql(`DO $release$ BEGIN
 PERFORM pg_advisory_xact_lock(hashtext('studocyte-diagnostic-v1'));
 IF EXISTS(SELECT 1 FROM public.mock_question_assignments WHERE mock_key='diagnostic-1') THEN RAISE EXCEPTION 'Diagnostic form already exists';END IF;
 INSERT INTO public.stimuli(id,subtest_id,title,data,sort_order) SELECT id,subtest_id,title,data,sort_order FROM jsonb_to_recordset(${q(JSON.stringify(p.stimuli))}::jsonb) AS s(id uuid,subtest_id uuid,title text,data jsonb,sort_order integer);
 INSERT INTO public.questions(id,subtest_id,stimulus_id,kind,topic,stem,data,explanation_text,difficulty,sort_order,published,tags) SELECT id,subtest_id,stimulus_id,kind::public.question_kind,topic,stem,data,explanation_text,difficulty,sort_order,published,tags FROM jsonb_to_recordset(${q(JSON.stringify(p.questions))}::jsonb) AS x(id uuid,subtest_id uuid,stimulus_id uuid,kind text,topic text,stem text,data jsonb,explanation_text text,difficulty text,sort_order integer,published boolean,tags text[]);
 INSERT INTO public.question_options(id,question_id,label,body,is_correct,sort_order) SELECT id,question_id,label,body,is_correct,sort_order FROM jsonb_to_recordset(${q(JSON.stringify(p.options))}::jsonb) AS o(id uuid,question_id uuid,label text,body text,is_correct boolean,sort_order integer);
 INSERT INTO public.mock_question_assignments(exam_id,subtest_id,mock_key,question_id,sort_order) SELECT exam_id,subtest_id,mock_key,question_id,sort_order FROM jsonb_to_recordset(${q(JSON.stringify(p.assignments))}::jsonb) AS a(exam_id uuid,subtest_id uuid,mock_key text,question_id uuid,sort_order integer);
 END $release$;`,false);
}else assert.equal(existing.length,184);
for(const key of ['questions','stimuli','options']){
 const rows=await byIds(key==='options'?'question_options':key,'*',p[key].map(r=>r.id));
 assert.equal(rows.length,p[key].length);for(const expected of p[key]){const actual=rows.find(x=>x.id===expected.id);for(const[k,v]of Object.entries(expected))assert.deepEqual(actual[k],v,`${expected.id}.${k}`)}
}
const after=await assignments();
for(const old of before)assert.deepEqual(after.find(a=>a.id===old.id),old);
const assigned=after.filter(a=>a.mock_key==='diagnostic-1');assert.equal(assigned.length,184);for(const expected of p.assignments){const actual=assigned.find(x=>x.question_id===expected.question_id);for(const[k,v]of Object.entries(expected))assert.deepEqual(actual[k],v)}
const result={questions:184,stimuli:p.stimuli.length,options:p.options.length,assignments:184,oldAssignmentsPreserved:true,allRowsMatch:true,questionBankExcluded:p.questions.every(x=>x.data.mock_only===true),verifiedAt:new Date().toISOString()};writeFileSync(`${dir}/content-verification.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
