import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { sql } from './lib/interview-operator.mjs'

const artifactDir = 'artifacts/interview-rewards-release'
const progressionFile = 'supabase/migrations/0068_interview_progression.sql'
const rewardsFile = 'supabase/migrations/0069_interview_rewards.sql'
mkdirSync(artifactDir, { recursive: true })

const before = await sql(`
  select
    to_regclass('public.interview_progression_events')::text as progression_events,
    to_regclass('public.interview_badges')::text as badges,
    (select count(*) from public.interview_attempts) as attempt_count,
    (select count(*) from public.interview_practice_logs) as practice_log_count
`)

if (!process.argv.includes('--apply')) {
  console.log(JSON.stringify(before))
  process.exit(0)
}

if (before[0]?.progression_events || before[0]?.badges) {
  throw new Error('Progression or reward schema already exists; inspect it instead of reapplying')
}

const progressionSql = readFileSync(progressionFile, 'utf8')
const rewardsSql = readFileSync(rewardsFile, 'utf8')
await sql(progressionSql, false)
await sql(rewardsSql, false)

const after = await sql(`
  select
    to_regclass('public.interview_progression_events')::text as progression_events,
    to_regclass('public.interview_badges')::text as badges,
    to_regclass('public.interview_focus_token_events')::text as focus_token_events,
    exists(
      select 1 from information_schema.columns
      where table_schema='public' and table_name='interview_progression_events' and column_name='explanation'
    ) as has_explanation,
    has_table_privilege('authenticated','public.interview_progression_events','SELECT') as student_can_read_xp,
    has_table_privilege('authenticated','public.interview_progression_events','UPDATE') as student_can_update_xp,
    has_table_privilege('service_role','public.interview_progression_events','UPDATE') as service_can_update_xp,
    has_table_privilege('authenticated','public.interview_badges','SELECT') as student_can_read_badges,
    (select count(*) from public.interview_attempts) as attempt_count,
    (select count(*) from public.interview_practice_logs) as practice_log_count
`)

const result = after[0]
if (!result?.progression_events || !result?.badges || !result?.focus_token_events || !result?.has_explanation) {
  throw new Error('Reward schema verification failed')
}
if (!result.student_can_read_xp || result.student_can_update_xp || result.service_can_update_xp || !result.student_can_read_badges) {
  throw new Error('Reward ledger permission verification failed')
}
if (Number(result.attempt_count) !== Number(before[0]?.attempt_count) || Number(result.practice_log_count) !== Number(before[0]?.practice_log_count)) {
  throw new Error('Existing interview history changed during migration')
}

const receipt = {
  before,
  after,
  existingInterviewHistoryUnchanged: true,
  sha256: {
    '0068_interview_progression.sql': createHash('sha256').update(progressionSql).digest('hex'),
    '0069_interview_rewards.sql': createHash('sha256').update(rewardsSql).digest('hex'),
  },
  appliedAt: new Date().toISOString(),
}
writeFileSync(`${artifactDir}/migration.json`, `${JSON.stringify(receipt, null, 2)}\n`)
console.log(JSON.stringify({ applied: ['0068', '0069'], verified: true, existingInterviewHistoryUnchanged: true }))
