import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { requireStagingApproval } from './lib/staging-operator.mjs'

requireStagingApproval('--authorised-staging-worker-secrets')

const project = 'prj_8V3gHxGJPlXmPx4JvwPZIUq4RGEp'
const team = 'team_Kabhu4fxCgOnBYGDvQBa8iqm'
const stagingEnvironment = 'env_lTMmLuW2TL7JNbI1GZMVpGqyTgYv'
const token = JSON.parse(readFileSync('/Users/patrick/Library/Application Support/com.vercel.cli/auth.json', 'utf8')).token
const endpoint = new URL(`https://api.vercel.com/v10/projects/${project}/env`)
endpoint.searchParams.set('teamId', team)

const currentResponse = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } })
if (!currentResponse.ok) throw new Error(`Unable to inspect Vercel environment: HTTP ${currentResponse.status}`)
const current = (await currentResponse.json()).envs
const scoped = (key) => current.find((entry) => entry.key === key && entry.customEnvironmentIds?.includes(stagingEnvironment))
const worker = scoped('INTERVIEW_WORKER_SECRET')
const cron = scoped('CRON_SECRET')

if (worker || cron) {
  if (!worker || !cron) throw new Error('Only one staging worker secret exists; inspect before rotating either value')
  console.log('Staging worker and cron secrets already exist; no rotation performed.')
  process.exit(0)
}

const secret = randomBytes(48).toString('base64url')
for (const key of ['INTERVIEW_WORKER_SECRET', 'CRON_SECRET']) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      key,
      value: secret,
      type: 'sensitive',
      target: ['preview'],
      customEnvironmentIds: [stagingEnvironment],
    }),
  })
  if (!response.ok) {
    await response.arrayBuffer()
    throw new Error(`Unable to create ${key}: HTTP ${response.status}`)
  }
  await response.arrayBuffer()
  console.log(`Created ${key} for the staging environment.`)
}
