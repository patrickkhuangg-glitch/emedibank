import assert from 'node:assert/strict'
import {test} from 'node:test'
import {loadModule} from './helpers/load-module.mjs'
const availability=loadModule('src/lib/questions/availability.ts')
const marks=loadModule('src/lib/practice/marks.ts')

test('legacy bank content remains available while either JSON representation of mock-only is reserved',()=>{
 for(const data of [null,{}, {mock_only:false},{mock_only:'false'}])assert.equal(availability.isMockOnly(data),false)
 for(const data of [{mock_only:true},{mock_only:'true'}])assert.equal(availability.isMockOnly(data),true)
})

test('all public practice access paths reject mock-exclusive questions before returning content or recording attempts',async()=>{
 const inserted=[]
 const meta={id:'exclusive',published:true,subtest_id:'qr',kind:'single_best_answer',data:{mock_only:true,statements:[{text:'A',correct:'Yes'}],mostLeast:{actions:[],correctMost:0,correctLeast:1}},video_status:'ready',mux_playback_id:'video'}
 const admin={from(table){const builder={select(){return this},eq(){return this},async maybeSingle(){return {data:table==='questions'?meta:{exam_id:'ucat',slug:'quantitative-reasoning'}}},async insert(row){inserted.push(row);return {error:null}}};return builder}}
 const access=loadModule('src/lib/access/questions.ts',{'@/lib/questions/availability':availability,'@/lib/practice/marks':marks,'@/lib/mock/qr-question-types.json':{default:{}},'@/lib/supabase/admin':{createAdminClient:()=>admin},'@/lib/access':{canAccessExam:async()=>true,hasActiveEntitlement:async()=>true}})
 assert.equal(await access.canAttemptQuestion('entitled','exclusive'),false)
 assert.equal(await access.canWatchExplanation('entitled','exclusive'),false)
 assert.equal((await access.getQuestionForAttempt('entitled','exclusive')).locked,true)
 assert.equal((await access.getQuestionsForAttempt('entitled',['exclusive'])).exclusive,null)
 for(const outcome of [await access.submitAnswer('entitled','exclusive','answer'),await access.submitGridAnswer('entitled','exclusive',{}),await access.submitMostLeastAnswer('entitled','exclusive',{most:0,least:1}),await access.revealSolution('entitled','exclusive'),await access.getExplanationPlayback('entitled','exclusive')])assert.equal(outcome.denied,true)
 assert.equal(inserted.length,0)
 // The internal builder stays usable by the signed, manifest-gated mock path.
 const safe=await access.buildSafeQuestion({...meta,data:{mock_only:true,statements:[{text:'A',correct:'Yes'}]},subtest_slug:'decision-making',tags:[]})
 assert.equal(safe.statements[0].text,'A');assert.equal('correct' in safe.statements[0],false)
})

test('QR has eight 36-question, 26-minute forms; other sections keep four',()=>{
 const config=loadModule('src/lib/mock/config.ts')
 for(let n=1;n<=8;n++){
  const form=config.findMiniMock('ucat','quantitative-reasoning',`mini-${n}`)
  assert.ok(form);assert.equal(form.sections[0].count,36);assert.equal(form.sections[0].minutes,26)
 }
 assert.equal(config.findMiniMock('ucat','quantitative-reasoning','mini-9'),null)
 for(const section of ['verbal-reasoning','decision-making','situational-judgement'])assert.equal(config.findMiniMock('ucat',section,'mini-5'),null)
})
