import {test} from 'node:test'
import assert from 'node:assert/strict'
import {fullDatabase} from './helpers/full-database.mjs'
import {loadModule} from './helpers/load-module.mjs'
test('two working days skip Sydney weekends, preserve weekday time, and handle DST',async()=>{
 const db=await fullDatabase()
 try{
  const due=async(value:string)=>(await db.query<{due:string}>("select to_char(interview_review_due_at($1::timestamptz) at time zone 'Australia/Sydney','YYYY-MM-DD HH24:MI') due",[value])).rows[0].due
  assert.equal(await due('2026-09-07T04:30:00Z'),'2026-09-09 14:30')
  assert.equal(await due('2026-09-11T04:30:00Z'),'2026-09-15 14:30')
  assert.equal(await due('2026-09-12T04:30:00Z'),'2026-09-16 00:00')
  assert.equal(await due('2026-10-02T04:30:00Z'),'2026-10-06 14:30')
  assert.equal(await due('2027-04-02T03:30:00Z'),'2027-04-06 14:30')
  await db.exec('set role authenticated')
  await assert.rejects(db.query('select * from interview_overdue_reviews'),/permission denied/)
 }finally{await db.close()}
})
test('overdue marking goes to primary, support and backup; unrelated alerts keep their route',()=>{
 const api=loadModule('src/lib/interviews/operation-alerts.ts',{'@/lib/supabase/admin':{},'./operation-messages':{operationMessages:{}}},{process:{env:{}}}) as {alertRecipients:(code:string,primary:string)=>string[]}
 assert.deepEqual(Array.from(api.alertRecipients('review_overdue','p.huang@emeducate.com.au')),['p.huang@emeducate.com.au','support@emeducate.com.au','e.zhang@emeducate.com.au'])
 assert.deepEqual(Array.from(api.alertRecipients('cleanup_overdue','p.huang@emeducate.com.au')),['p.huang@emeducate.com.au'])
 assert.equal(api.alertRecipients('review_overdue','support@emeducate.com.au').length,2)
 assert.throws(()=>api.alertRecipients('review_overdue','wrong\n@example.com'),/invalid_alert_recipient/)
})
