import assert from 'node:assert/strict'

import { team, vercel, vercelProject } from './lib/interview-operator.mjs'
import { requireStagingApproval } from './lib/staging-operator.mjs'

requireStagingApproval('--authorised-enable-staging-marking')

const stagingEnvironment = 'env_lTMmLuW2TL7JNbI1GZMVpGqyTgYv'
const keys = ['INTERVIEW_VIDEO_MARKING_ENABLED', 'INTERVIEW_WHOLE_PANEL_MARKING_ENABLED']
const current = await vercel(`/v10/projects/${vercelProject}/env?teamId=${team}`)

for (const key of keys) {
  const matches = current.envs.filter((entry) =>
    entry.key === key && entry.customEnvironmentIds?.includes(stagingEnvironment))
  assert.equal(matches.length, 1, `Expected exactly one staging-scoped ${key}`)
  const entry = matches[0]
  await vercel(`/v9/projects/${vercelProject}/env/${entry.id}?teamId=${team}`, {
    method: 'PATCH',
    body: JSON.stringify({
      key,
      value: 'true',
      type: 'encrypted',
      target: ['preview'],
      customEnvironmentIds: [stagingEnvironment],
    }),
  })
  console.log(`Enabled ${key} in staging.`)
}
