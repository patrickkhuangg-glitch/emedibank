// Rotates the staging-only worker credentials in memory, redeploys the exact
// committed release, and sends one synthetic operational alert. No student data
// or secret value is written to disk or printed.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { writeFileSync } from 'node:fs'

import { stagingSql, STAGING_APP } from './lib/staging-operator.mjs'
import { team, vercel, vercelProject } from './lib/interview-operator.mjs'

if (!process.argv.includes('--authorised-staging-alert-test')) {
  throw new Error('Explicit staging alert acceptance flag required')
}

const stagingEnvironment = 'env_lTMmLuW2TL7JNbI1GZMVpGqyTgYv'
const stagingAlias = 'staging.studocyte.emeducate.com.au'
const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
assert.equal(execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }), '', 'Release checkout must be clean')

const current = await vercel(`/v10/projects/${vercelProject}/env?teamId=${team}`)
const scoped = (key) => current.envs.find(
  (entry) => entry.key === key && entry.customEnvironmentIds?.includes(stagingEnvironment),
)
const worker = scoped('INTERVIEW_WORKER_SECRET')
const cron = scoped('CRON_SECRET')
assert(worker && cron, 'Staging worker secrets are not configured')

const secret = randomBytes(48).toString('base64url')
for (const entry of [worker, cron]) {
  await vercel(`/v9/projects/${vercelProject}/env/${entry.id}?teamId=${team}`, {
    method: 'PATCH',
    body: JSON.stringify({
      value: secret,
      type: 'sensitive',
      target: ['preview'],
      customEnvironmentIds: [stagingEnvironment],
    }),
  })
}

const deployment = JSON.parse(execFileSync(
  'node',
  ['scripts/deploy-staging-commit.mjs', '--base', head],
  { encoding: 'utf8' },
))
let ready
for (let attempt = 0; attempt < 48; attempt += 1) {
  ready = await vercel(`/v13/deployments/${deployment.deploymentId}?teamId=${team}`)
  if (ready.readyState === 'READY') break
  if (ready.readyState === 'ERROR' || ready.readyState === 'CANCELED') throw new Error('Staging redeployment failed')
  await new Promise((resolve) => setTimeout(resolve, 5_000))
}
assert.equal(ready?.readyState, 'READY', 'Staging redeployment did not become ready')

const aliases = await vercel(`/v4/aliases?projectId=${vercelProject}&teamId=${team}&limit=100`)
const alias = aliases.aliases?.find((entry) => entry.alias === stagingAlias)
assert.equal(alias?.deploymentId ?? alias?.deployment?.id, deployment.deploymentId, 'Staging alias is not attached to the new deployment')

await stagingSql('select public.check_interview_operations()', false)
const pendingBefore = await stagingSql("select count(*)::integer as count from public.interview_alert_deliveries where status in ('pending','sending')")
assert.equal(pendingBefore[0]?.count, 0, 'Existing operational alerts must be reviewed before the one-message delivery test')

const inserted = await stagingSql("insert into public.interview_alert_deliveries(code,episode_at,kind) values('setup_test',now(),'opened') returning id", false)
const alertId = inserted[0]?.id
assert.match(alertId ?? '', /^[a-f0-9-]{36}$/)

const response = await fetch(`${STAGING_APP}/api/internal/interviews/monitor`, {
  headers: { Authorization: `Bearer ${secret}` },
  redirect: 'error',
  signal: AbortSignal.timeout(90_000),
})
const result = await response.json()
assert.equal(response.status, 200)
assert.deepEqual(result, { configured: true, sent: 1, failed: 0 })
const receipt = await stagingSql(`select id,status,attempts,sent_at from public.interview_alert_deliveries where id='${alertId}'`)
assert.equal(receipt[0]?.status, 'sent')

writeFileSync('artifacts/release-acceptance/staging-alert-test.json', `${JSON.stringify({
  deploymentId: deployment.deploymentId,
  commit: head,
  alertId,
  status: receipt[0].status,
  attempts: receipt[0].attempts,
  sentAt: receipt[0].sent_at,
  recipient: 'p.huang@emeducate.com.au',
  subject: 'Studocyte interviews · Alert delivery test',
  verifiedAt: new Date().toISOString(),
}, null, 2)}\n`)

console.log('PASS Staging alert delivery test sent exactly one synthetic message')
