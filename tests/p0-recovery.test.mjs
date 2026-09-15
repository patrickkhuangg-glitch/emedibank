import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdirSync,writeFileSync} from 'node:fs'
import {PGlite} from '@electric-sql/pglite'
import {fullDatabase} from './helpers/full-database.mjs'

test('a database backup restores synthetic accounts, private data, migrations and access controls into isolation',async()=>{
 const source=await fullDatabase()
 const user=crypto.randomUUID()
 await source.query(`insert into auth.users(id,email,raw_app_meta_data) values($1,'recovery-fixture@example.test','{"provider":"google"}')`,[user])
 await source.query("insert into study_plan_tasks(user_id,body) values($1,'Synthetic recovery evidence')",[user])
 const tableCount=(await source.query("select count(*)::int n from pg_tables where schemaname='public'")).rows[0].n
 const started=new Date(),start=performance.now()
 const backup=await source.dumpDataDir('gzip')
 await source.close()
 const restored=new PGlite({loadDataDir:backup})
 try {
  const rows=(await restored.query('select body from study_plan_tasks where user_id=$1',[user])).rows
  assert.equal(rows[0].body,'Synthetic recovery evidence')
  assert.equal((await restored.query("select count(*)::int n from pg_tables where schemaname='public'")).rows[0].n,tableCount)
  await restored.exec('set role anon')
  await assert.rejects(restored.query('select * from study_plan_tasks'))
  await restored.exec(`reset role;set role authenticated;set request.jwt.claim.sub='${crypto.randomUUID()}'`)
  assert.equal((await restored.query('select * from study_plan_tasks')).rows.length,0)
  await restored.exec(`set request.jwt.claim.sub='${user}'`)
  assert.equal((await restored.query('select * from study_plan_tasks')).rows.length,1)
  mkdirSync('docs/security',{recursive:true})
  writeFileSync('docs/security/recovery-drill.local.json',JSON.stringify({scope:'Isolated local PGlite, synthetic data only; NOT a hosted production backup restore',startedAt:started.toISOString(),completedAt:new Date().toISOString(),elapsedSeconds:Math.round((performance.now()-start)/10)/100,backupBytes:backup.size,result:'passed',verified:[`${tableCount} application tables restored`,'synthetic account and private record restored','anonymous access denied','cross-account access denied','owner access allowed'],notVerified:['Supabase hosted backup/PITR','Storage file bytes','provider configuration and SMTP','production recovery time or recovery point']},null,2)+'\n')
 }finally{await restored.close()}
})
