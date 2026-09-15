import { createHash } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { team, vercel, vercelProject } from './lib/interview-operator.mjs'

const artifactDir = 'artifacts/live-practice-release'
const sourceDir = resolve('.vercel/live-practice-release')
const paths = [
  'next.config.ts',
  'src/app/(app)/interviews/live-practice/page.tsx',
  'src/app/(app)/interviews/live-practice/[roomId]/page.tsx',
  'src/app/api/interviews/attempts/initiate/route.ts',
  'src/app/api/interviews/live-rooms/route.ts',
  'src/app/api/interviews/live-rooms/[roomId]/route.ts',
  'src/app/api/interviews/live-rooms/[roomId]/ice/route.ts',
  'src/app/api/interviews/live-rooms/[roomId]/signals/route.ts',
  'src/components/interviews/live-practice-entry.tsx',
  'src/components/interviews/live-practice-room.tsx',
  'src/components/interviews/live-practice.module.css',
  'src/components/interviews/use-live-peer.ts',
  'src/components/site-nav.tsx',
  'src/lib/interviews/jobs.ts',
  'src/lib/interviews/live-ice.ts',
  'src/lib/interviews/live-practice-data.ts',
  'src/lib/interviews/live-practice.ts',
  'src/lib/interviews/mmi-evidence.ts',
  'src/lib/interviews/navigation.ts',
  'src/lib/interviews/speaker-transcript.ts',
  'src/lib/interviews/transcription.ts',
  'src/lib/supabase/types.ts',
  'src/lib/workspace/routes.ts',
  'supabase/migrations/0071_interview_live_practice.sql',
]

mkdirSync(artifactDir, { recursive: true })
rmSync(sourceDir, { recursive: true, force: true })
mkdirSync(sourceDir, { recursive: true })

const project = await vercel(`/v9/projects/${vercelProject}?teamId=${team}`)
const deployment = await vercel(`/v13/deployments/${project.targets.production.id}?teamId=${team}`)
if (deployment.readyState !== 'READY') throw new Error('Current production deployment is not ready')
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
