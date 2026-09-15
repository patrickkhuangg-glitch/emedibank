import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { requireStagingApproval, STAGING_APP } from './lib/staging-operator.mjs'

requireStagingApproval('--authorised-bounded-staging-load')

const requests = 120
const concurrency = 8
const paths = ['/', '/interview-preparation', '/api/health', '/robots.txt']
const samples = []
let next = 0
mkdirSync('artifacts/release-acceptance', { recursive: true })

async function worker() {
  while (next < requests) {
    const index = next++
    const path = paths[index % paths.length]
    const started = performance.now()
    try {
      const response = await fetch(`${STAGING_APP}${path}`, {
        redirect: 'follow',
        signal: AbortSignal.timeout(20_000),
      })
      await response.arrayBuffer()
      samples.push({ path, status: response.status, ms: performance.now() - started })
    } catch (error) {
      samples.push({ path, status: 0, ms: performance.now() - started, error: error.name })
    }
  }
}

const runStarted = performance.now()
await Promise.all(Array.from({ length: concurrency }, worker))
const durationMs = performance.now() - runStarted
const sorted = samples.map((sample) => sample.ms).sort((a, b) => a - b)
const percentile = (value) => sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * value) - 1)]
const failures = samples.filter((sample) => sample.status < 200 || sample.status >= 400)
const result = {
  target: STAGING_APP,
  requests,
  concurrency,
  durationMs: Math.round(durationMs),
  requestsPerSecond: Number((requests / (durationMs / 1000)).toFixed(2)),
  p50Ms: Math.round(percentile(0.5)),
  p95Ms: Math.round(percentile(0.95)),
  p99Ms: Math.round(percentile(0.99)),
  maxMs: Math.round(sorted.at(-1)),
  failures: failures.length,
  verifiedAt: new Date().toISOString(),
}
writeFileSync('artifacts/release-acceptance/staging-load.json', `${JSON.stringify(result, null, 2)}\n`)
console.log(JSON.stringify(result, null, 2))
assert.equal(failures.length, 0, 'All bounded staging requests must succeed')
assert(result.p95Ms < 5_000, `p95 ${result.p95Ms} ms exceeds the 5 s release threshold`)
