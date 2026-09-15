import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { vercel, team, vercelProject } from './lib/interview-operator.mjs'

const directory = 'artifacts/question-view-gate'
const read = (name) => JSON.parse(readFileSync(`${directory}/${name}.json`, 'utf8'))
const previous = read('deployment-before')
const manifest = read('manifest')
const localBefore = read('local-before')
const productionBefore = read('production-before')
const replacements = new Map()
for (const [file, original] of Object.entries(localBefore)) {
  assert.equal(productionBefore[file], original, `Rebase ${file} on its current production source`)
  const updated = readFileSync(file, 'utf8')
  assert.notEqual(updated, original, `No change in ${file}`)
  replacements.set(file, updated)
}
assert.equal(replacements.size, 10)
const additions = ['src/lib/practice/question-views.ts', 'src/lib/practice/use-question-views.ts']
for (const file of additions) {
  assert.ok(!manifest.some((entry) => entry.file === file), `Unexpected existing file ${file}`)
  replacements.set(file, readFileSync(file, 'utf8'))
}
const project = await vercel(`/v9/projects/${vercelProject}?teamId=${team}`)
assert.equal(project.targets.production.id, previous.id, 'Live deployment changed; refresh the source snapshot')
const files = manifest.map(({ file, sha, mode }) => replacements.has(file)
  ? { file, data: replacements.get(file), encoding: 'utf-8' }
  : { file, sha, mode })
for (const file of additions) files.push({ file, data: replacements.get(file), encoding: 'utf-8' })
writeFileSync(`${directory}/released-source.json`, JSON.stringify(Object.fromEntries(replacements)))
const result = await vercel(`/v13/deployments?teamId=${team}`, {
  method: 'POST',
  body: JSON.stringify({
    name: previous.name,
    project: vercelProject,
    target: 'production',
    files,
    meta: { actor: 'codex', purpose: 'Require all questions viewed before manual marking; consistent Studocyte session titles', sourceDeployment: previous.id },
  }),
})
writeFileSync(`${directory}/release.json`, JSON.stringify(result, null, 2) + '\n')
console.log(JSON.stringify({ id: result.id, state: result.readyState, url: result.url, changedFiles: [...replacements.keys()] }))
