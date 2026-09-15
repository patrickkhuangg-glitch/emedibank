import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { vercel, team, vercelProject } from './lib/interview-operator.mjs'

const directory = 'artifacts/ucat-bus-tables'
const previous = JSON.parse(readFileSync(`${directory}/deployment-before.json`, 'utf8'))
const manifest = JSON.parse(readFileSync(`${directory}/source-manifest.json`, 'utf8'))
const project = await vercel(`/v9/projects/${vercelProject}?teamId=${team}`)
assert.equal(project.targets.production.id, previous.id, 'Live deployment changed; rebase the fix before releasing')
const replacements = new Map(['session-runner', 'mock-runner'].map((name) => [
  `src/components/${name}.tsx`, readFileSync(`${directory}/${name}-patched.tsx`, 'utf8'),
]))
assert.equal(manifest.filter(({ file }) => replacements.has(file)).length, 2)
const files = manifest.map(({ file, sha, mode }) => replacements.has(file)
  ? { file, data: replacements.get(file), encoding: 'utf-8' }
  : { file, sha, mode })
const result = await vercel(`/v13/deployments?teamId=${team}`, {
  method: 'POST',
  body: JSON.stringify({
    name: previous.name,
    project: vercelProject,
    target: 'production',
    files,
    meta: { actor: 'codex', purpose: 'Separate question tables in practice and show all tables in mocks', sourceDeployment: previous.id },
  }),
})
writeFileSync(`${directory}/release.json`, JSON.stringify(result, null, 2) + '\n')
console.log(JSON.stringify({ id: result.id, state: result.readyState, url: result.url, changedFiles: [...replacements.keys()] }))
