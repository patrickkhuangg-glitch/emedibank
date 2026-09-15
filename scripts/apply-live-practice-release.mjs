import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { sql } from './lib/interview-operator.mjs'

const artifactDir = 'artifacts/live-practice-release'
const migrationFile = 'supabase/migrations/0071_interview_live_practice.sql'
mkdirSync(artifactDir, { recursive: true })

const before = await sql(`
  select
    to_regclass('public.interview_live_rooms')::text as live_rooms,
    to_regclass('public.account_active_sessions')::text as active_sessions,
    (select count(*) from public.interview_attempts) as attempt_count,
    (select count(*) from public.interview_practice_logs) as practice_log_count
`)

if (!process.argv.includes('--apply')) {
  console.log(JSON.stringify(before))
  process.exit(0)
}
if (before[0]?.live_rooms) throw new Error('Live Practice schema already exists; inspect it instead of reapplying')
if (!before[0]?.active_sessions) throw new Error('The preceding single-device session migration is not present')

const migration = readFileSync(migrationFile, 'utf8')
await sql(migration, false)

const after = await sql(`
  select
    to_regclass('public.interview_live_rooms')::text as live_rooms,
    to_regclass('public.interview_live_participants')::text as participants,
    to_regclass('public.interview_live_feedback')::text as feedback,
    to_regclass('public.interview_live_signals')::text as signals,
    to_regclass('public.interview_live_events')::text as events,
    (select bool_and(relrowsecurity) from pg_class where oid in (
      'public.interview_live_rooms'::regclass,
      'public.interview_live_participants'::regclass,
      'public.interview_live_feedback'::regclass,
      'public.interview_live_signals'::regclass,
      'public.interview_live_events'::regclass
    )) as all_rls,
    has_table_privilege('authenticated','public.interview_live_rooms','SELECT') as student_can_read_rooms,
    has_table_privilege('authenticated','public.interview_live_rooms','INSERT') as student_can_insert_rooms,
    has_table_privilege('service_role','public.interview_live_rooms','INSERT') as service_can_insert_rooms,
    (select count(*) from public.interview_attempts) as attempt_count,
    (select count(*) from public.interview_practice_logs) as practice_log_count
`)

const result = after[0]
if (!result?.live_rooms || !result?.participants || !result?.feedback || !result?.signals || !result?.events || !result?.all_rls) throw new Error('Live Practice schema verification failed')
if (result.student_can_read_rooms || result.student_can_insert_rooms || !result.service_can_insert_rooms) throw new Error('Live Practice permission verification failed')
if (Number(result.attempt_count) !== Number(before[0]?.attempt_count) || Number(result.practice_log_count) !== Number(before[0]?.practice_log_count)) throw new Error('Existing interview history changed during migration')

const receipt = {
  before,
  after,
  existingInterviewHistoryUnchanged: true,
  sha256: createHash('sha256').update(migration).digest('hex'),
  appliedAt: new Date().toISOString(),
}
writeFileSync(`${artifactDir}/migration.json`, `${JSON.stringify(receipt, null, 2)}\n`)
console.log(JSON.stringify({ applied: ['0071'], verified: true, existingInterviewHistoryUnchanged: true }))
