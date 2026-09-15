import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { APP, team, vercel, vercelProject } from './lib/interview-operator.mjs'

const artifactDir = 'artifacts/live-practice-release'
const read = name => JSON.parse(readFileSync(`${artifactDir}/${name}.json`, 'utf8'))
const release = read('release')
const expected = read('releasedSource')
const deployment = await vercel(`/v13/deployments/${release.id}?teamId=${team}`)
assert.equal(deployment.readyState, 'READY')
const project = await vercel(`/v9/projects/${vercelProject}?teamId=${team}`)
assert.equal(project.targets.production.id, release.id)
assert(deployment.alias.includes(new URL(APP).hostname))

const tree = await vercel(`/v6/deployments/${release.id}/files?teamId=${team}`)
const manifest = []
function walk(nodes, prefix = '') { for (const node of nodes) { const file = prefix + node.name; if (node.type === 'directory') walk(node.children ?? [], `${file}/`); else manifest.push({ file, sha: node.uid }) } }
const sourceRoot = tree.find(node => node.name === 'src' && node.type === 'directory')
assert(sourceRoot)
walk(sourceRoot.children ?? [])
for (const [file, content] of Object.entries(expected)) assert.equal(manifest.find(entry => entry.file === file)?.sha, createHash('sha1').update(content).digest('hex'), `Unexpected published source: ${file}`)

const checks = []
for (const path of ['/interviews/live-practice', '/api/interviews/live-rooms', '/api/interviews/live-rooms/not-a-room/ice']) {
  const response = await fetch(`${APP}${path}`, { redirect: 'manual' })
  checks.push({ path, status: response.status, location: response.headers.get('location'), cache: response.headers.get('cache-control') })
  assert([302, 303, 307, 401, 403, 404, 405].includes(response.status), `${path} returned unexpected status ${response.status}`)
}
const home = await fetch(APP)
assert.equal(home.status, 200)
assert.match(home.headers.get('permissions-policy') ?? '', /camera=\(self\)/)
checks.push({ path: '/', status: home.status, permissionsPolicy: home.headers.get('permissions-policy') })

const result = { deployment: release.id, url: APP, verifiedFiles: Object.keys(expected).length, checks, verifiedAt: new Date().toISOString() }
writeFileSync(`${artifactDir}/hosted-verification.json`, `${JSON.stringify(result, null, 2)}\n`)
console.log(JSON.stringify(result))
