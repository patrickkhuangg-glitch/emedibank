// Disposable two-account hosted privacy test. No email, payment, recording or AI request is made.
import assert from 'node:assert/strict'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { createServerClient } from '@supabase/ssr'
import { APP as PRODUCTION_APP, SUPABASE_URL as PRODUCTION_SUPABASE_URL, clients as productionClients } from './lib/interview-operator.mjs'
import { STAGING_APP, STAGING_SUPABASE_URL, stagingClients } from './lib/staging-operator.mjs'

const staging = process.argv.includes('--authorised-staging-privacy-test')
if (!staging && !process.argv.includes('--authorised-public-beta-test')) throw new Error('Explicit hosted verification flag required')
const APP = staging ? STAGING_APP : PRODUCTION_APP
const SUPABASE_URL = staging ? STAGING_SUPABASE_URL : PRODUCTION_SUPABASE_URL
const clients = staging ? stagingClients : productionClients
const artifactDir = staging ? 'artifacts/release-acceptance' : 'artifacts/live-practice-release'
const run = randomUUID(), users = [], checks = []
const { admin, publicKey } = await clients()
let roomId, failure
const data = (result, label) => { if (result.error) throw new Error(`${label}: ${result.error.code ?? result.error.status ?? 'service_error'}`); return result.data }
const pass = label => { checks.push(label); console.log(`PASS ${label}`) }

async function account(label) {
  const email = `live-practice-${run}-${label}@example.invalid`
  const password = `${randomBytes(32).toString('base64url')}!Aa9`
  const phone = `+614${String(randomBytes(4).readUInt32BE() % 100_000_000).padStart(8, '0')}`
  const ticket = randomBytes(32).toString('hex')
  data(await admin.rpc('authorize_signup', { p_email: email, p_token_hash: createHash('sha256').update(ticket).digest('hex') }), 'authorise disposable signup')
  const created = data(await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: `Synthetic ${label}`, phone_number: phone, interview_intro_v1: 'skipped', hosted_test_run: run, signup_authorization: ticket } }), 'create disposable account').user
  const jar = new Map()
  const client = createServerClient(SUPABASE_URL, publicKey, { cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: values => values.forEach(({ name, value }) => jar.set(name, value)) }, auth: { autoRefreshToken: false } })
  data(await client.auth.signInWithPassword({ email, password }), 'sign in disposable account')
  assert.equal(data(await client.rpc('claim_single_device_session'), 'claim disposable device'), true)
  const user = { id: created.id, client, cookie: [...jar].map(([name, value]) => `${name}=${value}`).join('; ') }
  users.push(user)
  return user
}

async function request(path, user, method = 'GET', body, origin = APP) {
  const response = await fetch(`${APP}${path}`, { method, redirect: 'manual', headers: { Origin: origin, 'Content-Type': 'application/json', ...(user ? { Cookie: user.cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(45_000) })
  const text = await response.text()
  let json
  try { json = JSON.parse(text) } catch {}
  return { status: response.status, json, text, headers: response.headers }
}

try {
  const candidate = await account('Candidate'), examiner = await account('Examiner'), outsider = await account('Outsider')
  const exam = data(await admin.from('exams').select('id').eq('slug', 'interviews').single(), 'read Interviews exam')
  data(await admin.from('entitlements').insert(users.map(user => ({ user_id: user.id, exam_id: exam.id, source: 'comp', interview_trial_only: false }))), 'grant disposable full access')

  const crossOrigin = await request('/api/interviews/live-rooms', candidate, 'POST', { action: 'create', stationId: 'mmi-confidentiality-patient-safety', recordingEnabled: false }, 'https://unrelated.example')
  assert.equal(crossOrigin.status, 403)
  const created = await request('/api/interviews/live-rooms', candidate, 'POST', { action: 'create', stationId: 'mmi-confidentiality-patient-safety', recordingEnabled: false })
  assert.equal(created.status, 201); assert.match(created.json.inviteCode, /^[A-Z2-9]{6}$/); roomId = created.json.roomId
  const stored = data(await admin.from('interview_live_rooms').select('invite_code_hash').eq('id', roomId).single(), 'read room hash')
  assert.equal(stored.invite_code_hash.length, 64); assert.notEqual(stored.invite_code_hash, created.json.inviteCode)
  pass('Room creation is authenticated, same-origin and stores only a hashed invite code')

  const joined = await request('/api/interviews/live-rooms', examiner, 'POST', { action: 'join', code: created.json.inviteCode })
  assert.equal(joined.status, 200); assert.equal(joined.json.roomId, roomId)
  assert.equal((await request(`/api/interviews/live-rooms/${roomId}`, outsider)).status, 404)
  const direct = await outsider.client.from('interview_live_rooms').select('*').eq('id', roomId)
  assert(direct.error || direct.data.length === 0)
  pass('Only the invited two accounts can enter; direct browser table access stays closed')

  for (const user of [candidate, examiner]) {
    assert.equal((await request(`/api/interviews/live-rooms/${roomId}`, user, 'PATCH', { action: 'presence', mediaReady: true })).status, 200)
    assert.equal((await request(`/api/interviews/live-rooms/${roomId}`, user, 'PATCH', { action: 'ready', ready: true })).status, 200)
    const ice = await request(`/api/interviews/live-rooms/${roomId}/ice`, user)
    assert.equal(ice.status, 200); assert(Array.isArray(ice.json.iceServers) && ice.json.iceServers.length >= 1)
    assert.match(ice.headers.get('cache-control') ?? '', /no-store/)
  }
  const lobby = await request(`/api/interviews/live-rooms/${roomId}`, candidate)
  assert.equal(lobby.json.phase, 'lobby'); assert.equal(lobby.json.station.preparation, null); assert.deepEqual(lobby.json.station.questions, [])
  const started = await request(`/api/interviews/live-rooms/${roomId}`, candidate, 'PATCH', { action: 'start' })
  assert.equal(started.status, 200); assert.equal(started.json.phase, 'briefing'); assert.equal(started.json.station.preparation, null); assert.deepEqual(started.json.station.questions, [])
  const prepared = await request(`/api/interviews/live-rooms/${roomId}`, candidate, 'PATCH', { action: 'advance' })
  assert.equal(prepared.status, 200); assert.equal(prepared.json.phase, 'preparation'); assert.equal(typeof prepared.json.station.preparation, 'string'); assert(prepared.json.station.questions.length > 0)
  pass('Both roles ready independently, ICE configuration is private, and the prompt stays hidden until preparation')

  const page = await request('/interviews/live-practice', candidate)
  assert.equal(page.status, 200); assert(page.text.includes('Practise with a real person.')); assert(!page.text.includes('One station, four clear moments'))
  pass('The published Live Practice page loads without the removed four-step explainer')
} catch (error) {
  failure = error instanceof Error ? error.message : String(error)
  console.error(`FAIL ${failure}`)
  process.exitCode = 1
} finally {
  const cleanupErrors = []
  for (const user of users) {
    try {
      const current = data(await admin.auth.admin.getUserById(user.id), 'read disposable ownership').user
      assert.equal(current.user_metadata.hosted_test_run, run)
      data(await admin.auth.admin.deleteUser(user.id), 'delete disposable account')
    } catch { cleanupErrors.push(user.id) }
  }
  if (roomId) {
    const remaining = await admin.from('interview_live_rooms').select('id', { count: 'exact', head: true }).eq('id', roomId)
    if (remaining.error || remaining.count !== 0) cleanupErrors.push('room')
  }
  if (cleanupErrors.length) { failure = `${failure ?? ''}; cleanup required`; process.exitCode = 1 }
  else pass('Disposable accounts, entitlements, room, signals and feedback were removed')
  writeFileSync(`${artifactDir}/${staging ? 'two-student-privacy-staging' : 'authenticated-verification'}.json`, `${JSON.stringify({ run, staging, passed: !failure, checks, fixtureUserIds: users.map(user => user.id), roomId, failure: failure ?? null, verifiedAt: new Date().toISOString() }, null, 2)}\n`)
}
