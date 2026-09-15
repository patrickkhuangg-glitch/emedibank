import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { team, vercel, vercelProject } from './lib/interview-operator.mjs'

const outputDirectory = 'artifacts/decision-making-category-order'
const targetFile = 'src/lib/practice/categories.ts'
const requestedCategories = [
  'Syllogisms',
  'Logic Puzzles',
  'Recognising Assumptions',
  'Interpreting Information',
  'Venn Diagrams',
  'Probability',
]
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
assert.ok(sourceRoot?.children, 'Production source tree unavailable')
walk(sourceRoot.children)
const targetEntry = manifest.find((entry) => entry.file === targetFile)
assert.ok(targetEntry, `Production source is missing ${targetFile}`)
const fileResponse = await vercel(`/v8/deployments/${sourceDeployment.id}/files/${targetEntry.sha}?teamId=${team}`)
const productionSource = Buffer.from(fileResponse.data, 'base64').toString('utf8')

const sectionPattern = /(    'decision-making': \[\n)[\s\S]*?(\n    \],)/
assert.equal((productionSource.match(sectionPattern) ?? []).length > 0, true, 'Decision Making category array not found')
const categoryLines = requestedCategories.map((category) => `      '${category}',`).join('\n')
const updatedSource = productionSource.replace(sectionPattern, `$1${categoryLines}$2`)
assert.notEqual(updatedSource, productionSource, 'Production already has the requested subset order')
const updatedSection = updatedSource.match(sectionPattern)?.[0] ?? ''
for (const category of requestedCategories) assert.ok(updatedSection.includes(`'${category}'`), `Missing ${category}`)
assert.deepEqual([...updatedSection.matchAll(/      '([^']+)',/g)].map((match) => match[1]), requestedCategories)

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
    meta: {
      actor: 'codex',
      purpose: 'Restore Interpreting Information and apply the requested Decision Making subset order',
      sourceDeployment: sourceDeployment.id,
    },
  }),
})
writeFileSync(`${outputDirectory}/source-deployment.json`, JSON.stringify(sourceDeployment, null, 2) + '\n')
writeFileSync(`${outputDirectory}/release.json`, JSON.stringify(release, null, 2) + '\n')
writeFileSync(`${outputDirectory}/released-source.ts`, updatedSource)
console.log(JSON.stringify({ id: release.id, state: release.readyState, url: release.url, categories: requestedCategories }))
