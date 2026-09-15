import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'

import { team, vercel, vercelProject } from './lib/interview-operator.mjs'

const stagingAlias = 'staging.studocyte.emeducate.com.au'
const artifactDir = '.vercel/staging-commit-release'
const baseArg = process.argv.indexOf('--base')
const baseCommit = baseArg >= 0 ? process.argv[baseArg + 1] : ''

assert(baseCommit, 'Usage: node scripts/deploy-staging-commit.mjs --base <commit>')
assert.equal(execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }), '', 'Release checkout must be clean')

const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
execFileSync('git', ['merge-base', '--is-ancestor', baseCommit, commit])

mkdirSync(artifactDir, { recursive: true })

const aliases = await vercel(`/v4/aliases?projectId=${vercelProject}&teamId=${team}&limit=100`)
const staging = aliases.aliases?.find((entry) => entry.alias === stagingAlias)
const deploymentId = staging?.deploymentId ?? staging?.deployment?.id
assert(deploymentId, 'Staging alias is not attached to a deployment')

const baseline = await vercel(`/v13/deployments/${deploymentId}?teamId=${team}`)
assert.equal(baseline.readyState, 'READY', 'Current staging deployment is not ready')

const changes = execFileSync('git', ['diff', '--name-status', `${baseCommit}..${commit}`], { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean)
  .map((line) => {
    const [status, ...paths] = line.split('\t')
    return { status, before: paths.length > 1 ? paths[0] : null, path: paths.at(-1) }
  })

const tracked = execFileSync('git', ['ls-files', '-z'])
  .toString('utf8')
  .split('\0')
  .filter(Boolean)
const files = tracked.map((file) => {
  assert(existsSync(file), `Tracked file is missing: ${file}`)
  const data = readFileSync(file)
  return data.includes(0)
    ? { file, data: data.toString('base64'), encoding: 'base64' }
    : { file, data: data.toString('utf8'), encoding: 'utf-8' }
})

const sourceDigest = createHash('sha256')
for (const { path } of changes.filter(({ status }) => !status.startsWith('D')).sort((a, b) => a.path.localeCompare(b.path))) {
  sourceDigest.update(path).update('\0').update(readFileSync(path)).update('\0')
}

const result = await vercel(`/v13/deployments?teamId=${team}`, {
  method: 'POST',
  body: JSON.stringify({
    name: baseline.name,
    project: vercelProject,
    target: 'staging',
    files,
    meta: {
      actor: 'codex',
      purpose: 'staging-openai-and-admin-mfa-acceptance',
      sourceCommit: commit,
      sourceBaseCommit: baseCommit,
      sourceDigest: sourceDigest.digest('hex'),
      sourceDeployment: baseline.id,
    },
  }),
})

const receipt = {
  deploymentId: result.id,
  deploymentUrl: result.url,
  baselineDeploymentId: baseline.id,
  baseCommit,
  commit,
  changedFiles: changes,
  uploadedFiles: files.length,
}
writeFileSync(`${artifactDir}/release.json`, `${JSON.stringify(receipt, null, 2)}\n`)
console.log(JSON.stringify(receipt))
