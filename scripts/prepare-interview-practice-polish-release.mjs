import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { team, vercel, vercelProject } from './lib/interview-operator.mjs'

const directory = 'artifacts/interview-practice-polish-release'
const paths = [
  'src/lib/interviews/timing.ts',
  'src/components/interview-practice-lobby.tsx',
  'src/components/interview-practice-lobby.module.css',
  'src/components/interviews/question-display.tsx',
  'src/components/interviews/cyto-coach.tsx',
  'src/components/interviews/cyto-coach.module.css',
  'src/components/interviews/interaction-layer.tsx',
  'src/components/interviews/practice-buttons.ts',
  'src/components/interviews/rehearsal-runner.tsx',
  'src/components/interview-practice-runner.tsx',
  'src/components/interview-workspace-pages.tsx',
  'src/lib/haptics.ts',
  'src/app/(app)/interviews/layout.tsx',
  'src/app/prototypes/interviews/page.tsx',
  'src/components/workspace/interview-dashboard.module.css',
]

mkdirSync(directory, { recursive: true })
const project = await vercel(`/v9/projects/${vercelProject}?teamId=${team}`)
const deployment = await vercel(`/v13/deployments/${project.targets.production.id}?teamId=${team}`)
const tree = await vercel(`/v6/deployments/${deployment.id}/files?teamId=${team}`)
const manifest = []
function walk(nodes, prefix = '') {
  for (const node of nodes) {
    const file = prefix + node.name
    if (node.type === 'directory') walk(node.children ?? [], `${file}/`)
    else manifest.push({ file, sha: node.uid, mode: node.mode ?? 33188 })
  }
}
walk(tree.find((node) => node.name === 'src').children)

const production = {}
for (let index = 0; index < paths.length; index += 8) {
  await Promise.all(paths.slice(index, index + 8).map(async (file) => {
    const entry = manifest.find((candidate) => candidate.file === file)
    production[file] = entry
      ? Buffer.from((await vercel(`/v8/deployments/${deployment.id}/files/${entry.sha}?teamId=${team}`)).data, 'base64').toString('utf8')
      : null
  }))
}

const releasedSource = Object.fromEntries(paths.map((file) => [file, readFileSync(file, 'utf8')]))
for (const [name, value] of Object.entries({ deployment, manifest, paths, production, releasedSource })) {
  writeFileSync(`${directory}/${name}.json`, `${JSON.stringify(value, null, 2)}\n`)
}
console.log(JSON.stringify({ deployment: deployment.id, url: deployment.url, files: manifest.length, changedFiles: paths.length }))
