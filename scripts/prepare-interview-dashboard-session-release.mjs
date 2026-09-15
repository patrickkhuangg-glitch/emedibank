import { createHash } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { team, vercel, vercelProject } from './lib/interview-operator.mjs'

const artifactDir = 'artifacts/interview-dashboard-session-release'
const sourceDir = resolve('.vercel/interview-dashboard-session-release')
const paths = [
  'src/app/(app)/interviews/focus-shop/page.tsx',
  'src/app/(auth)/login/page.tsx',
  'src/app/auth/callback/route.ts',
  'src/app/auth/confirm/route.ts',
  'src/components/interviews/focus-token-shop.module.css',
  'src/components/interviews/focus-token-shop.tsx',
  'src/components/interviews/progression-dashboard.module.css',
  'src/components/interviews/progression-dashboard.tsx',
  'src/components/site-nav.tsx',
  'src/lib/auth/actions.ts',
  'src/lib/auth/single-device.ts',
  'src/lib/interviews/progression-data.ts',
  'src/lib/interviews/progression.ts',
  'src/lib/supabase/proxy.ts',
  'src/lib/supabase/types.ts',
  'supabase/migrations/0070_single_device_sessions.sql',
]

mkdirSync(artifactDir, { recursive: true })
rmSync(sourceDir, { recursive: true, force: true })
mkdirSync(sourceDir, { recursive: true })

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

const sourceRoot = tree.find(node => node.name === 'src' && node.type === 'directory')
if (!sourceRoot) throw new Error('Production source tree is unavailable')
walk(sourceRoot.children ?? [])

for (let index = 0; index < manifest.length; index += 12) {
  await Promise.all(manifest.slice(index, index + 12).map(async entry => {
    let content
    if (existsSync(entry.file)) {
      const local = readFileSync(entry.file)
      if (createHash('sha1').update(local).digest('hex') === entry.sha) content = local
    }
    if (!content) {
      const response = await vercel(`/v8/deployments/${deployment.id}/files/${entry.sha}?teamId=${team}`)
      content = Buffer.from(response.data, 'base64')
    }
    if (createHash('sha1').update(content).digest('hex') !== entry.sha) throw new Error(`Production source hash mismatch: ${entry.file}`)
    const destination = `${sourceDir}/${entry.file}`
    mkdirSync(dirname(destination), { recursive: true })
    writeFileSync(destination, content)
  }))
}

const releasedSource = {}
for (const file of paths) {
  const content = readFileSync(file, 'utf8')
  const destination = `${sourceDir}/${file}`
  mkdirSync(dirname(destination), { recursive: true })
  writeFileSync(destination, content)
  releasedSource[file] = content
}
if (!existsSync(`${sourceDir}/node_modules`)) symlinkSync(resolve('node_modules'), `${sourceDir}/node_modules`, 'dir')

for (const [name, value] of Object.entries({ deployment, manifest, paths, releasedSource })) {
  writeFileSync(`${artifactDir}/${name}.json`, `${JSON.stringify(value, null, 2)}\n`)
}
writeFileSync(`${artifactDir}/source-path.txt`, `${sourceDir}\n`)
console.log(JSON.stringify({ baseline: deployment.id, files: manifest.length, changedFiles: paths.length, sourceDir }))
