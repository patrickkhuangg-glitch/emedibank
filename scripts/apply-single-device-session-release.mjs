import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { sql } from './lib/interview-operator.mjs'

const artifactDir = 'artifacts/interview-dashboard-session-release'
const migrationFile = 'supabase/migrations/0070_single_device_sessions.sql'
mkdirSync(artifactDir, { recursive: true })

const before = await sql(`
  select
    to_regclass('public.account_active_sessions')::text as active_sessions,
    (select count(*) from public.profiles) as profile_count,
    (select count(*) from public.interview_practice_logs) as practice_log_count
`)

if (!process.argv.includes('--apply')) {
  console.log(JSON.stringify(before))
  process.exit(0)
}
if (before[0]?.active_sessions) throw new Error('Single-device session schema already exists; inspect it instead of reapplying')

const migration = readFileSync(migrationFile, 'utf8')
await sql(migration, false)

const after = await sql(`
  select
    to_regclass('public.account_active_sessions')::text as active_sessions,
    (select relrowsecurity from pg_class where oid='public.account_active_sessions'::regclass) as active_sessions_rls,
    (select relrowsecurity from pg_class where oid='public.interview_progression_settings'::regclass) as progression_settings_rls,
    has_table_privilege('authenticated','public.account_active_sessions','SELECT') as student_can_read_sessions,
    has_function_privilege('authenticated','public.claim_single_device_session()','EXECUTE') as student_can_claim,
    has_function_privilege('authenticated','public.is_current_device_session()','EXECUTE') as student_can_validate,
    (select count(*) from public.profiles) as profile_count,
    (select count(*) from public.interview_practice_logs) as practice_log_count
`)

const result = after[0]
if (!result?.active_sessions || !result.active_sessions_rls || !result.progression_settings_rls || result.student_can_read_sessions || !result.student_can_claim || !result.student_can_validate) {
  throw new Error('Single-device session permission verification failed')
}
if (Number(result.profile_count) !== Number(before[0]?.profile_count) || Number(result.practice_log_count) !== Number(before[0]?.practice_log_count)) {
  throw new Error('Existing account or interview history changed during migration')
}

const receipt = {
  before,
  after,
  existingAccountAndInterviewHistoryUnchanged: true,
  sha256: createHash('sha256').update(migration).digest('hex'),
  appliedAt: new Date().toISOString(),
}
writeFileSync(`${artifactDir}/migration.json`, `${JSON.stringify(receipt, null, 2)}\n`)
console.log(JSON.stringify({ applied: ['0070'], verified: true, existingAccountAndInterviewHistoryUnchanged: true }))
