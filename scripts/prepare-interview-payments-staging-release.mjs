import { createHash } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'

import { team, vercel, vercelProject } from './lib/interview-operator.mjs'

const artifactDir = 'artifacts/interview-payments-staging-release'
const sourceDir = resolve('.vercel/interview-payments-staging-release')
const stagingAlias = 'staging.studocyte.emeducate.com.au'
const paths = [
  'src/app/(app)/account/page.tsx',
  'src/app/(marketing)/interview-preparation/page.tsx',
  'src/app/(marketing)/pricing/page.tsx',
  'src/app/(marketing)/pricing/pricing-cards.tsx',
  'src/app/api/stripe/webhook/route.ts',
  'src/components/marketing/interviews/interactions.tsx',
  'src/components/marketing/interviews/landing.module.css',
  'src/lib/interviews/marketing.ts',
  'src/lib/stripe/interview-actions.ts',
  'src/lib/stripe/interview-purchase.ts',
  'src/lib/stripe/sync-subscription.ts',
  'src/lib/supabase/types.ts',
]

mkdirSync(artifactDir, { recursive: true })
rmSync(sourceDir, { recursive: true, force: true })
mkdirSync(sourceDir, { recursive: true })

const aliases = await vercel(`/v4/aliases?projectId=${vercelProject}&teamId=${team}&limit=100`)
const staging = aliases.aliases?.find((entry) => entry.alias === stagingAlias)
const deploymentId = staging?.deploymentId ?? staging?.deployment?.id
if (!deploymentId) throw new Error('Staging alias is not attached to a deployment')

const deployment = await vercel(`/v13/deployments/${deploymentId}?teamId=${team}`)
if (deployment.readyState !== 'READY') throw new Error('Staging baseline is not ready')
const tree = await vercel(`/v6/deployments/${deployment.id}/files?teamId=${team}`)
const manifest = []

function walk(nodes, prefix = '') {
  for (const node of nodes) {
    const file = prefix + node.name
    if (node.type === 'directory') walk(node.children ?? [], `${file}/`)
    else manifest.push({ file, sha: node.uid, mode: node.mode ?? 33188 })
  }
}

const sourceRoot = tree.find((node) => node.name === 'src' && node.type === 'directory')
if (!sourceRoot) throw new Error('Staging source tree is unavailable')
walk(sourceRoot.children ?? [])

for (let index = 0; index < manifest.length; index += 12) {
  await Promise.all(manifest.slice(index, index + 12).map(async (entry) => {
    let content
    if (existsSync(entry.file)) {
      const local = readFileSync(entry.file)
      if (createHash('sha1').update(local).digest('hex') === entry.sha) content = local
    }
    if (!content) {
      try {
        const response = await vercel(`/v8/deployments/${deployment.id}/files/${entry.sha}?teamId=${team}`)
        content = Buffer.from(response.data, 'base64')
      } catch (error) {
        throw new Error(`Unable to download staging source file ${entry.file} (${entry.sha})`, { cause: error })
      }
    }
    if (createHash('sha1').update(content).digest('hex') !== entry.sha) {
      throw new Error(`Staging source hash mismatch: ${entry.file}`)
    }
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

if (!existsSync(`${sourceDir}/node_modules`)) {
  symlinkSync(resolve('node_modules'), `${sourceDir}/node_modules`, 'dir')
}

for (const [name, value] of Object.entries({ deployment, manifest, paths, releasedSource })) {
  writeFileSync(`${artifactDir}/${name}.json`, `${JSON.stringify(value, null, 2)}\n`)
}
writeFileSync(`${artifactDir}/source-path.txt`, `${sourceDir}\n`)

console.log(JSON.stringify({
  baseline: deployment.id,
  files: manifest.length,
  changedFiles: paths.length,
  sourceDir,
}))
