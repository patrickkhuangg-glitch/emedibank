import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url),{registerHooks}=require('node:module')
const context={actor:null as null|{id:string;role:string},calls:[] as Array<{name:string;args:Record<string,unknown>}>,paths:[] as string[],response:{data:{status:'added'},error:null} as {data:null|{status:string};error:null|{message:string}}}
;(globalThis as unknown as {creditActionTest:typeof context}).creditActionTest=context
const mocks:Record<string,string>={
 '@/lib/auth/dal':"exports.getProfile=async()=>globalThis.creditActionTest.actor",
 '@/lib/supabase/admin':"exports.createAdminClient=()=>({rpc:async(name,args)=>{globalThis.creditActionTest.calls.push({name,args});return globalThis.creditActionTest.response}})",
 'next/cache':"exports.revalidatePath=path=>globalThis.creditActionTest.paths.push(path)",
}
registerHooks({
 resolve(s:string,c:object,next:(s:string,c:object)=>object){return s in mocks?{url:'credit-test:'+s,shortCircuit:true}:next(s,c)},
 load(url:string,c:object,next:(url:string,c:object)=>object){return url.startsWith('credit-test:')?{format:'commonjs',source:mocks[url.slice(12)],shortCircuit:true}:next(url,c)},
})
const {addMarkingCreditsAction}=require('../src/lib/admin/marking-credit-actions') as typeof import('../src/lib/admin/marking-credit-actions')
const form=()=>{const f=new FormData();for(const [k,v] of Object.entries({userId:'00000000-0000-4000-8000-000000000001',requestId:'00000000-0000-4000-8000-000000000004',essayAmount:'4',interviewAmount:'12',note:' Package top-up ',actorId:'forged-admin'}))f.set(k,v);return f}

test('credit action authenticates the actual admin, validates inputs and safely reports retries or unavailable setup',async()=>{
 for(const role of [null,'student','tutor']){
  context.actor=role?{id:'actor',role}:null
  assert.match((await addMarkingCreditsAction({},form())).error??'',/Only admins/)
 }
 assert.equal(context.calls.length,0)
 context.actor={id:'00000000-0000-4000-8000-000000000002',role:'admin'}
 for(const [field,value] of [['essayAmount','-1'],['interviewAmount','1.5'],['essayAmount','1e2'],['essayAmount','10001'],['userId','bad-id'],['requestId',''],['note','x'.repeat(501)]]){
  const f=form();f.set(field,value);assert.ok((await addMarkingCreditsAction({},f)).error)
 }
 const zero=form();zero.set('essayAmount','0');zero.set('interviewAmount','0');assert.ok((await addMarkingCreditsAction({},zero)).error)
 assert.equal(context.calls.length,0)
 assert.match((await addMarkingCreditsAction({},form())).message??'',/Added 4 essay marking and 12 interview marking credits/)
 assert.equal(context.calls.length,1)
 assert.equal(context.calls[0].args.p_actor_id,context.actor.id)
 assert.equal(context.calls[0].args.p_note,'Package top-up')
 assert.ok(context.paths.includes('/admin/students'));assert.ok(context.paths.includes('/interviews/mock-interviews'));assert.ok(context.paths.includes('/account'))
 for(const status of ['already_applied','request_conflict','student_unavailable']){
  context.response={data:{status},error:null}
  const result=await addMarkingCreditsAction({},form())
  assert.ok(status==='already_applied'?result.message:result.error)
 }
 context.response={data:null,error:{message:'missing database function'}}
 assert.match((await addMarkingCreditsAction({},form())).error??'',/Retry this entry safely/)
})
