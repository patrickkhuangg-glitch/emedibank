import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { vercel, team, vercelProject } from './lib/interview-operator.mjs'

const directory = 'artifacts/ucat-ui-titles'
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
assert.equal(replacements.size, 7)
const project = await vercel(`/v9/projects/${vercelProject}?teamId=${team}`)
assert.equal(project.targets.production.id, previous.id, 'Live deployment changed; refresh the source snapshot')
const files = manifest.map(({ file, sha, mode }) => replacements.has(file)
  ? { file, data: replacements.get(file), encoding: 'utf-8' }
  : { file, sha, mode })
writeFileSync(`${directory}/released-source.json`, JSON.stringify(Object.fromEntries(replacements)))
const result = await vercel(`/v13/deployments?teamId=${team}`, {
  method: 'POST',
  body: JSON.stringify({
    name: previous.name,
    project: vercelProject,
    target: 'production',
    files,
    meta: { actor: 'codex', purpose: 'Custom Studocyte UCAT titles and remove Explain Answer toolbar label', sourceDeployment: previous.id },
  }),
})
writeFileSync(`${directory}/release.json`, JSON.stringify(result, null, 2) + '\n')
console.log(JSON.stringify({ id: result.id, state: result.readyState, url: result.url, changedFiles: [...replacements.keys()] }))
