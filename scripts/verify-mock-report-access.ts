import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
async function main(){
// Import the existing operator without printing environment values.
const {clients, SUPABASE_URL} = await import('./lib/interview-operator.mjs')
const {admin,publicKey}=await clients()
process.env.NEXT_PUBLIC_SUPABASE_URL=SUPABASE_URL
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=publicKey
// The admin helper uses a server secret, read from the already authenticated client.
const secret=(admin as unknown as {supabaseKey:string}).supabaseKey
process.env.SUPABASE_SECRET_KEY=secret
const {hasPaidMockReport}=await import('../src/lib/mock/report/access')
const f=JSON.parse(readFileSync('/tmp/studocyte-diagnostic-fixture.json','utf8'))
const{data:exam}=await admin.from('exams').select('id').eq('slug','ucat').single()
assert(exam)
const{data:product}=await admin.from('products').select('id').eq('exam_id',exam.id).limit(1).single()
assert(product)
const results:Record<string,boolean>={}
results.free=!(await hasPaidMockReport(f.id,exam.id));assert(results.free)
await admin.from('entitlements').insert({user_id:f.id,exam_id:exam.id,source:'subscription',expires_at:new Date(Date.now()+86400000).toISOString()})
const{data:sub,error}=await admin.from('subscriptions').insert({user_id:f.id,product_id:product.id,status:'trialing',current_period_end:new Date(Date.now()+86400000).toISOString()}).select('id').single()
assert(!error&&sub)
results.trial=!(await hasPaidMockReport(f.id,exam.id));assert(results.trial)
await admin.from('subscriptions').update({status:'active'}).eq('id',sub.id)
results.paid=await hasPaidMockReport(f.id,exam.id);assert(results.paid)
await admin.from('subscriptions').update({current_period_end:new Date(Date.now()-86400000).toISOString()}).eq('id',sub.id)
results.expired=!(await hasPaidMockReport(f.id,exam.id));assert(results.expired)
await admin.from('entitlements').insert({user_id:f.id,exam_id:exam.id,source:'comp'})
results.comp=await hasPaidMockReport(f.id,exam.id);assert(results.comp)
await admin.from('entitlements').delete().eq('user_id',f.id)
await admin.from('subscriptions').delete().eq('user_id',f.id)
writeFileSync('artifacts/mock-report-release/access-check.json',JSON.stringify(results,null,2))
console.log('Free, trial, paid, expired and complimentary report-access checks passed on the disposable account')

}
main().catch(e=>{console.error(e.message);process.exit(1)})
