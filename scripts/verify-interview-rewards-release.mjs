import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { team, vercel, vercelProject } from './lib/interview-operator.mjs'

const artifactDir = 'artifacts/interview-rewards-release'
const release = JSON.parse(readFileSync(`${artifactDir}/release.json`, 'utf8'))
const paths = JSON.parse(readFileSync(`${artifactDir}/paths.json`, 'utf8'))
const project = await vercel(`/v9/projects/${vercelProject}?teamId=${team}`)
if (project.targets.production.id !== release.id) throw new Error('Production alias does not point to the reward release')

const deployment = await vercel(`/v13/deployments/${release.id}?teamId=${team}`)
if (deployment.readyState !== 'READY') throw new Error(`Deployment is ${deployment.readyState}`)

const tree = await vercel(`/v6/deployments/${release.id}/files?teamId=${team}`)
const manifest = []
function walk(nodes, prefix = '') {
  for (const node of nodes) {
    const file = prefix + node.name
    if (node.type === 'directory') walk(node.children ?? [], `${file}/`)
    else manifest.push({ file, sha: node.uid })
  }
}
const sourceRoot = tree.find((node) => node.name === 'src' && node.type === 'directory')
if (!sourceRoot) throw new Error('Published source tree is unavailable')
walk(sourceRoot.children ?? [])

for (const file of paths) {
  const published = manifest.find((entry) => entry.file === file)
  const expected = createHash('sha1').update(readFileSync(file)).digest('hex')
  if (!published || published.sha !== expected) throw new Error(`Published source mismatch: ${file}`)
}

async function check(url, expectedStatuses, options = {}) {
  const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(15000), ...options })
  if (!expectedStatuses.includes(response.status)) throw new Error(`${url} returned ${response.status}`)
  return { url, status: response.status, location: response.headers.get('location') }
}

const checks = [
  await check('https://studocyte.emeducate.com.au/api/health', [200]),
  await check('https://studocyte.emeducate.com.au/interviews', [302, 303, 307, 308]),
  await check('https://studocyte.emeducate.com.au/interviews/practice/session', [302, 303, 307, 308]),
  await check('https://studocyte.emeducate.com.au/api/interviews/progression', [401, 403], {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  }),
]

const verification = {
  deployment: release.id,
  ready: true,
  productionAlias: true,
  exactChangedSource: true,
  changedFiles: paths.length,
  checks,
  verifiedAt: new Date().toISOString(),
}
writeFileSync(`${artifactDir}/verification.json`, `${JSON.stringify(verification, null, 2)}\n`)
console.log(JSON.stringify(verification))
