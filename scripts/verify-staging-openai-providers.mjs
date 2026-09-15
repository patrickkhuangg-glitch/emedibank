import assert from 'node:assert/strict'
import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { createServerClient } from '@supabase/ssr'

import { quoteSql, requireStagingApproval, STAGING_APP, STAGING_SUPABASE_URL, stagingClients, stagingSql } from './lib/staging-operator.mjs'

requireStagingApproval('--authorised-synthetic-provider-test')
const audioArg = process.argv.indexOf('--audio')
const audioPath = audioArg >= 0 ? process.argv[audioArg + 1] : ''
assert(audioPath, 'Supply --audio <synthetic-wav>')

const run = randomUUID()
const email = `openai-provider-check-${run}@example.invalid`
const password = `${randomBytes(24).toString('base64url')}!Aa9`
const signupTicket = randomBytes(32).toString('hex')
const checks = []
let userId = ''

function decodeBase32(value) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  for (const character of value.toUpperCase().replace(/=+$/g, '')) {
    const index = alphabet.indexOf(character)
    assert(index >= 0, 'Invalid TOTP secret')
    bits += index.toString(2).padStart(5, '0')
  }
  return Buffer.from(bits.match(/.{8}/g)?.map((byte) => Number.parseInt(byte, 2)) ?? [])
}

function totp(secret, timestamp = Date.now()) {
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(Math.floor(timestamp / 30_000)))
  const digest = createHmac('sha1', decodeBase32(secret)).update(counter).digest()
  const offset = digest.at(-1) & 0x0f
  const number = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000
  return String(number).padStart(6, '0')
}

function cookieHeader(jar) {
  return [...jar].map(([name, value]) => `${name}=${value}`).join('; ')
}

async function request(path, jar, body, contentType) {
  const response = await fetch(`${STAGING_APP}${path}`, {
    method: 'POST',
    headers: {
      Origin: STAGING_APP,
      Cookie: cookieHeader(jar),
      ...(contentType ? { 'Content-Type': contentType } : {}),
    },
    body,
    redirect: 'manual',
    signal: AbortSignal.timeout(280_000),
  })
  const payload = await response.json().catch(() => null)
  return { status: response.status, payload }
}

const { admin, publicKey } = await stagingClients()
try {
  assert.ifError((await admin.rpc('authorize_signup', {
    p_email: email,
    p_token_hash: createHash('sha256').update(signupTicket).digest('hex'),
  })).error)
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: 'Synthetic provider check',
      hosted_test_run: run,
      interview_intro_v1: 'skipped',
      signup_authorization: signupTicket,
    },
  })
  assert.ifError(created.error)
  userId = created.data.user.id
  await stagingSql(`update public.profiles set role = 'admin' where id = ${quoteSql(userId)}::uuid`, false)

  const jar = new Map()
  const client = createServerClient(STAGING_SUPABASE_URL, publicKey, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (values) => values.forEach(({ name, value }) => jar.set(name, value)),
    },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  assert.ifError((await client.auth.signInWithPassword({ email, password })).error)

  const beforeMfa = await request('/api/admin/interviews/provider-check', jar, JSON.stringify({ check: 'marking' }), 'application/json')
  assert.equal(beforeMfa.status, 403)
  checks.push('Provider check rejects an admin session without MFA.')

  const enrollment = await client.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Disposable provider check', issuer: 'Studocyte staging' })
  assert.ifError(enrollment.error)
  assert.ifError((await client.auth.mfa.challengeAndVerify({
    factorId: enrollment.data.id,
    code: totp(enrollment.data.totp.secret),
  })).error)
  assert.equal((await client.auth.mfa.getAuthenticatorAssuranceLevel()).data?.currentLevel, 'aal2')
  checks.push('Disposable staging admin reached AAL2 with TOTP.')

  const form = new FormData()
  form.set('audio', new File([readFileSync(audioPath)], 'synthetic-provider-check.wav', { type: 'audio/wav' }))
  const transcription = await request('/api/admin/interviews/provider-check', jar, form)
  assert.equal(transcription.status, 200)
  assert.equal(transcription.payload?.status, 'passed')
  assert.equal(transcription.payload?.containsExpectedWords, true)
  checks.push(`Synthetic transcription passed with ${transcription.payload.model}.`)

  const marking = await request('/api/admin/interviews/provider-check', jar, JSON.stringify({ check: 'marking' }), 'application/json')
  assert.equal(marking.status, 200)
  assert.equal(marking.payload?.status, 'passed')
  checks.push(`Synthetic assessment and audit passed with ${marking.payload.assessmentModel}.`)

  writeFileSync('artifacts/release-acceptance/openai-provider-check.json', `${JSON.stringify({
    run,
    staging: STAGING_APP,
    passed: true,
    synthetic: true,
    studentDataUsed: false,
    checks,
    providerRequestIds: {
      transcription: transcription.payload.requestId,
      assessment: marking.payload.assessmentRequestId,
      audit: marking.payload.auditRequestId,
    },
  }, null, 2)}\n`)
  checks.forEach((check) => console.log(`PASS ${check}`))
} finally {
  if (userId) {
    const deleted = await admin.auth.admin.deleteUser(userId)
    assert.ifError(deleted.error)
  }
}
