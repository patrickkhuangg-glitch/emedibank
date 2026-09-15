import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { team, vercel, vercelProject } from './lib/interview-operator.mjs'

const artifactDir = 'artifacts/account-welcome-release'
const sourceDir = readFileSync(`${artifactDir}/source-path.txt`, 'utf8').trim()
const read = name => JSON.parse(readFileSync(`${artifactDir}/${name}.json`, 'utf8'))

if (process.argv.includes('--status')) {
  const release = read('release')
  const deployment = await vercel(`/v13/deployments/${release.id}?teamId=${team}`)
  writeFileSync(`${artifactDir}/deployment-status.json`, `${JSON.stringify(deployment, null, 2)}\n`)
  console.log(JSON.stringify({ id: deployment.id, state: deployment.readyState, url: deployment.url, aliases: deployment.alias, error: deployment.errorMessage }))
  process.exit(0)
}

assert(!existsSync(`${artifactDir}/release.json`), 'Release already submitted')
assert(existsSync(`${sourceDir}/.next/BUILD_ID`), 'Exact release source has not passed a production build')

const baseline = read('deployment')
const manifest = read('manifest')
const paths = read('paths')
const changes = read('releasedSource')
assert.deepEqual(Object.keys(changes).sort(), paths.sort())
for (const [file, content] of Object.entries(changes)) assert.equal(readFileSync(`${sourceDir}/${file}`, 'utf8'), content, `Built source changed: ${file}`)
for (const { file, sha } of manifest) {
  if (file in changes) continue
  assert.equal(createHash('sha1').update(readFileSync(`${sourceDir}/${file}`)).digest('hex'), sha, `Production baseline changed: ${file}`)
}

const project = await vercel(`/v9/projects/${vercelProject}?teamId=${team}`)
assert.equal(project.targets.production.id, baseline.id, 'Production changed; prepare again before publishing')
const files = manifest.map(({ file, sha, mode }) => file in changes ? { file, data: changes[file], encoding: 'utf-8' } : { file, sha, mode })
for (const [file, data] of Object.entries(changes)) if (!manifest.some(entry => entry.file === file)) files.push({ file, data, encoding: 'utf-8' })

const result = await vercel(`/v13/deployments?teamId=${team}`, {
  method: 'POST',
  body: JSON.stringify({
    name: baseline.name,
    project: vercelProject,
    target: 'production',
    files,
    meta: { purpose: 'Full-screen student welcome and subtle LMS entry transition', sourceDeployment: baseline.id },
  }),
})
writeFileSync(`${artifactDir}/release.json`, `${JSON.stringify(result, null, 2)}\n`)
console.log(JSON.stringify({ id: result.id, state: result.readyState, url: result.url, changedFiles: Object.keys(changes).length }))
