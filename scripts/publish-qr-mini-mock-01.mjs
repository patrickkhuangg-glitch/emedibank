import assert from 'node:assert/strict'
import {readFileSync,writeFileSync} from 'node:fs'
import {clients} from './lib/interview-operator.mjs'
const dir='artifacts/ucat-mock-review-release'
const {admin:db}=await clients()
async function get(query){const {data,error}=await query;if(error)throw new Error(error.message);return data}
const manifest=JSON.parse(readFileSync('../output/ucat-qr-mock-01/mock-manifest.json'))
assert.equal(manifest.question_count,36);assert.equal(manifest.minutes,26)
assert.deepEqual(manifest.groups.map(g=>g.questionIds.length),[4,4,4,4,4,4,4,1,1,1,1,1,1,1,1])
const exam=await get(db.from('exams').select('id').eq('slug','ucat').single())
const sub=await get(db.from('subtests').select('id').eq('exam_id',exam.id).eq('slug','quantitative-reasoning').single())
const key='mini-quantitative-reasoning-1'
const before=await get(db.from('mock_question_assignments').select('*').eq('exam_id',exam.id).eq('mock_key',key).order('sort_order'))
const assignments=manifest.assignments.map(q=>({exam_id:exam.id,mock_key:key,subtest_id:sub.id,question_id:q.question_id,sort_order:q.sort_order}))
assert.equal(new Set(assignments.map(q=>q.question_id)).size,36)
const questions=await get(db.from('questions').select('id,published,subtest_id,stimulus_id').in('id',assignments.map(q=>q.question_id)))
assert.equal(questions.length,36)
for(const item of assignments){const q=questions.find(q=>q.id===item.question_id);assert(q.published&&q.subtest_id===sub.id);assert.equal(q.stimulus_id,manifest.assignments.find(m=>m.question_id===q.id).stimulus_id)}
if(before.length){assert.deepEqual(before.map(q=>[q.question_id,q.sort_order]),assignments.map(q=>[q.question_id,q.sort_order]),'Existing mock differs; do not overwrite it')}
else await get(db.from('mock_question_assignments').insert(assignments).select('id'))
const after=await get(db.from('mock_question_assignments').select('*').eq('exam_id',exam.id).eq('mock_key',key).order('sort_order'))
assert.deepEqual(after.map(q=>q.question_id),assignments.map(q=>q.question_id))
writeFileSync(`${dir}/published-mock.json`,JSON.stringify({publishedAt:new Date().toISOString(),key,title:manifest.title,minutes:26,questions:36,fullSets:7,singleSets:8,assignments:after},null,2))
console.log(JSON.stringify({published:true,key,questions:36,minutes:26,fullSets:7,singleSets:8,created:before.length===0}))
