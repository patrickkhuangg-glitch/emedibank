import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { team, vercel, vercelProject } from './lib/interview-operator.mjs'

const outputDirectory = 'artifacts/interpreting-information-category'
const targetFile = 'src/lib/practice/categories.ts'
mkdirSync(outputDirectory, { recursive: true })

const project = await vercel(`/v9/projects/${vercelProject}?teamId=${team}`)
const sourceDeployment = await vercel(`/v13/deployments/${project.targets.production.id}?teamId=${team}`)
const tree = await vercel(`/v6/deployments/${sourceDeployment.id}/files?teamId=${team}`)
const manifest = []
function walk(nodes, prefix = '') {
  for (const node of nodes) {
    const file = prefix + node.name
    if (node.type === 'directory') walk(node.children ?? [], file + '/')
    else manifest.push({ file, sha: node.uid, mode: node.mode ?? 33188 })
  }
}
const sourceRoot = tree.find((node) => node.name === 'src')
assert.ok(sourceRoot?.children)
walk(sourceRoot.children)
const targetEntry = manifest.find((entry) => entry.file === targetFile)
assert.ok(targetEntry)
const fileResponse = await vercel(`/v8/deployments/${sourceDeployment.id}/files/${targetEntry.sha}?teamId=${team}`)
const productionSource = Buffer.from(fileResponse.data, 'base64').toString('utf8')
assert.equal((productionSource.match(/'Interpreting Information'/g) ?? []).length, 0, 'Interpreting Information already exists in production taxonomy')
assert.equal((productionSource.match(/'Syllogisms'/g) ?? []).length, 1)
const updatedSource = productionSource.replace("      'Syllogisms',\n", "      'Syllogisms',\n      'Interpreting Information',\n")
assert.equal((updatedSource.match(/'Interpreting Information'/g) ?? []).length, 1)
assert.equal(updatedSource, readFileSync(targetFile, 'utf8'), 'Local taxonomy diverges from the surgical production edit')

const refreshed = await vercel(`/v9/projects/${vercelProject}?teamId=${team}`)
assert.equal(refreshed.targets.production.id, sourceDeployment.id, 'Production changed; refresh before deploying')
const files = manifest.map(({ file, sha, mode }) => file === targetFile ? { file, data: updatedSource, encoding: 'utf-8' } : { file, sha, mode })
const release = await vercel(`/v13/deployments?teamId=${team}`, {
  method: 'POST',
  body: JSON.stringify({
    name: sourceDeployment.name,
    project: vercelProject,
    target: 'production',
    files,
    meta: { actor: 'codex', purpose: 'Expose the populated Interpreting Information practice category', sourceDeployment: sourceDeployment.id },
  }),
})
writeFileSync(`${outputDirectory}/source-deployment.json`, JSON.stringify(sourceDeployment, null, 2) + '\n')
writeFileSync(`${outputDirectory}/release.json`, JSON.stringify(release, null, 2) + '\n')
writeFileSync(`${outputDirectory}/released-source.ts`, updatedSource)
console.log(JSON.stringify({ id: release.id, state: release.readyState, url: release.url, changedFiles: [targetFile] }))
