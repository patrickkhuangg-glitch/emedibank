import assert from 'node:assert/strict'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createServerClient } from '@supabase/ssr'
import {
  requireStagingApproval,
  STAGING_APP,
  STAGING_SUPABASE_URL,
  stagingClients,
} from './lib/staging-operator.mjs'

requireStagingApproval('--authorised-staging-session-test')

const run = randomUUID()
const artifactDir = 'artifacts/release-acceptance'
const checks = []
let createdUser
let failure
mkdirSync(artifactDir, { recursive: true })

const data = (result, label) => {
  if (result.error) throw new Error(`${label}: ${result.error.code ?? result.error.status ?? 'service_error'}`)
  return result.data
}
const pass = (message) => {
  checks.push(message)
  console.log(`PASS ${message}`)
}

function device(publicKey) {
  const jar = new Map()
  const client = createServerClient(STAGING_SUPABASE_URL, publicKey, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (values) => values.forEach(({ name, value }) => jar.set(name, value)),
    },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return {
    client,
    cookie: () => [...jar].map(([name, value]) => `${name}=${value}`).join('; '),
  }
}

async function page(path, currentDevice, redirect = 'manual') {
  return fetch(`${STAGING_APP}${path}`, {
    redirect,
    headers: { Cookie: currentDevice.cookie() },
    signal: AbortSignal.timeout(30_000),
  })
}

try {
  const { admin, publicKey } = await stagingClients()
  const email = `single-device-${run}@example.invalid`
  const password = `${randomBytes(32).toString('base64url')}!Aa9`
  const ticket = randomBytes(32).toString('hex')
  data(await admin.rpc('authorize_signup', {
    p_email: email,
    p_token_hash: createHash('sha256').update(ticket).digest('hex'),
  }), 'authorise disposable signup')
  createdUser = data(await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: 'Synthetic device acceptance',
      hosted_test_run: run,
      interview_intro_v1: 'skipped',
      signup_authorization: ticket,
    },
  }), 'create disposable account').user

  const exam = data(await admin.from('exams').select('id').eq('slug', 'interviews').single(), 'read Interviews exam')
  data(await admin.from('entitlements').insert({
    user_id: createdUser.id,
    exam_id: exam.id,
    source: 'comp',
    interview_trial_only: false,
  }), 'grant disposable Interviews access')

  const first = device(publicKey)
  const second = device(publicKey)
  data(await first.client.auth.signInWithPassword({ email, password }), 'first device sign in')
  assert.equal(data(await first.client.rpc('claim_single_device_session'), 'first device claim'), true)
  const firstCurrentPage = await page('/interviews/live-practice', first, 'follow')
  assert.equal(firstCurrentPage.status, 200)
  assert(!new URL(firstCurrentPage.url).pathname.startsWith('/login'))
  pass('First signed-in device can use the protected Interviews workspace')

  data(await second.client.auth.signInWithPassword({ email, password }), 'second device sign in')
  assert.equal(data(await second.client.rpc('claim_single_device_session'), 'second device claim'), true)
  const secondPage = await page('/interviews/live-practice', second, 'follow')
  assert.equal(secondPage.status, 200)
  assert(!new URL(secondPage.url).pathname.startsWith('/login'))
  pass('A second sign-in becomes the current device')

  const firstPage = await page('/interviews/live-practice', first)
  assert.equal(firstPage.status, 307)
  const location = firstPage.headers.get('location') ?? ''
  assert.match(location, /\/login\?error=session_replaced/)
  assert.match(location, /redirectTo=%2Finterviews%2Flive-practice/)
  assert.equal(data(await first.client.rpc('is_current_device_session'), 'first device validation'), false)
  assert.equal(data(await second.client.rpc('is_current_device_session'), 'second device validation'), true)
  pass('The previous device is rejected immediately and receives the session-replaced login route')
} catch (error) {
  failure = error instanceof Error ? error.message : String(error)
  console.error(`FAIL ${failure}`)
  process.exitCode = 1
} finally {
  try {
    if (createdUser) {
      const { admin } = await stagingClients()
      const current = data(await admin.auth.admin.getUserById(createdUser.id), 'verify cleanup ownership').user
      assert.equal(current.user_metadata.hosted_test_run, run)
      data(await admin.auth.admin.deleteUser(createdUser.id), 'remove disposable account')
      pass('Disposable account, entitlement and active-device record were removed')
    }
  } catch {
    failure = `${failure ?? ''}; fixture cleanup requires attention`
    process.exitCode = 1
  }

  writeFileSync(`${artifactDir}/single-device-staging.json`, `${JSON.stringify({
    run,
    staging: true,
    passed: !failure,
    checks,
    failure: failure ?? null,
    verifiedAt: new Date().toISOString(),
  }, null, 2)}\n`)
}
