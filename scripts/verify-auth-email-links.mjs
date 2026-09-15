// Hosted checks generate links without sending mail. Credentials remain in memory.
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { randomBytes, randomUUID } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
if (!process.argv.includes('--authorised-public-beta-test')) throw new Error('Explicit operator authorisation required')
const app = process.argv.find(a => a.startsWith('https://'))
if (!app || !(new URL(app).hostname.endsWith('.vercel.app') || new URL(app).hostname === 'studocyte.emeducate.com.au')) throw new Error('Supply the verified beta deployment URL')
const project = 'ghxwyfiemvyhijpmrhgf', url = `https://${project}.supabase.co`
const ids = [], checks = []
let admin, publicKey, phase = 'configuration', failed = false
const pass = label => { checks.push(label); console.log('PASS ' + label) }
const options = { auth: { persistSession: false, autoRefreshToken: false } }
async function fixture(confirmed, role = 'student') {
  const email = `account-email-${randomUUID()}@example.invalid`, password = randomBytes(32).toString('base64url') + '!Aa9'
  const result = await admin.auth.admin.createUser({ email, password, email_confirm: confirmed, user_metadata: { full_name: 'Disposable account email test' } })
  assert.ok(!result.error && result.data.user)
  ids.push(result.data.user.id)
  assert.equal((await admin.from('profiles').update({ role }).eq('id', result.data.user.id)).error, null)
  return { id: result.data.user.id, email, password, role }
}
async function link(type, account) {
  const result = await admin.auth.admin.generateLink({ type, email: account.email, options: { redirectTo: 'https://studocyte.emeducate.com.au/auth/confirm?next=/update-password' } })
  assert.ok(!result.error && result.data.properties?.hashed_token)
  if (!ids.includes(result.data.user.id)) ids.push(result.data.user.id)
  return new URLSearchParams({ token_hash: result.data.properties.hashed_token, type })
}
async function request(params, method = 'GET', origin = app) {
  const response = await fetch(app + '/auth/confirm' + (method === 'GET' ? '?' + params : ''), {
    method, redirect: 'manual', signal: AbortSignal.timeout(45000),
    headers: method === 'POST' ? { Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded' } : {},
    body: method === 'POST' ? params.toString() : undefined,
  })
  return response
}
async function verify(params, expected, userId) {
  for (let i = 0; i < 2; i++) {
    const page = await request(params)
    assert.equal(page.status, 200)
    assert.match(await page.text(), /method="post"/)
    assert.match(page.headers.get('cache-control'), /no-store/)
    assert.equal(page.headers.get('referrer-policy'), 'strict-origin')
  }
  const denied = await request(params, 'POST', 'https://unrelated.example')
  assert.equal(denied.status, 403)
  assert.doesNotMatch(await denied.text(), /expired/)
  const opaqueOrigin = await request(params, 'POST', 'null')
  assert.equal(opaqueOrigin.status, 403)
  assert.doesNotMatch(await opaqueOrigin.text(), /expired/)
  const response = await request(params, 'POST')
  assert.equal(response.status, 303)
  assert.equal(new URL(response.headers.get('location')).pathname, new URL(expected, app).pathname)
  const jar = new Map()
  for (const cookie of response.headers.getSetCookie()) {
    const pair = cookie.split(';')[0], split = pair.indexOf('=')
    jar.set(pair.slice(0, split), decodeURIComponent(pair.slice(split + 1)))
  }
  const client = createServerClient(url, publicKey, { cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: entries => entries.forEach(({ name, value }) => jar.set(name, value)) }, auth: { autoRefreshToken: false, persistSession: false } })
  const authenticated = await client.auth.getUser()
  assert.equal(authenticated.data.user?.id, userId)
  const cookieHeader = [...jar].map(([name, value]) => `${name}=${encodeURIComponent(value)}`).join('; ')
  const destination = await fetch(app + expected, { headers: { Cookie: cookieHeader }, redirect: 'manual', signal: AbortSignal.timeout(45000) })
  assert.equal(destination.status, 200)
  const html = await destination.text()
  if (expected === '/update-password') assert.match(html, /password/i)
  const replay = await request(params, 'POST')
  assert.equal(replay.status, 400)
  assert.match(await replay.text(), /expired or has already been used/)
  return { client, cookieHeader, html }
}
async function setPasswordThroughWebsite(verified, password) {
  const form = [...verified.html.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/g)].map(match => match[0]).find(html => /name="password"/.test(html))
  assert.ok(form)
  const decode = value => value.replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
  const data = new FormData()
  for (const [input] of form.matchAll(/<input\b[^>]*>/g)) {
    const name = input.match(/name="([^"]*)"/)?.[1]
    const value = input.match(/value="([^"]*)"/)?.[1] ?? ''
    if (name && name !== 'password') data.append(decode(name), decode(value))
  }
  data.set('password', password)
  const response = await fetch(app + '/update-password', { method: 'POST', headers: { Origin: app, Cookie: verified.cookieHeader }, body: data, redirect: 'manual', signal: AbortSignal.timeout(45000) })
  assert.equal(response.status, 303)
  assert.equal(new URL(response.headers.get('location'), app).pathname, '/account')
}

try {
  const { stdout } = await promisify(execFile)('/Users/patrick/.npm/_npx/aa8e5c70f9d8d161/node_modules/.bin/supabase', ['projects', 'api-keys', '--project-ref', project, '--reveal', '--output', 'json'], { timeout: 60000, maxBuffer: 1048576 })
  const keys = JSON.parse(stdout); publicKey = keys.find(k => k.type === 'publishable')?.api_key
  const secret = keys.find(k => k.type === 'secret')?.api_key
  assert.ok(secret && publicKey); admin = createClient(url, secret, options)
  phase = 'new invitation'
  const invitee = { email: `account-email-invite-${randomUUID()}@example.invalid` }
  const invitation = await link('invite', invitee)
  const inviteId = ids.at(-1)
  const inviteClient = await verify(invitation, '/update-password', inviteId)
  const password = randomBytes(32).toString('base64url') + '!Aa9'
  await setPasswordThroughWebsite(inviteClient, password)
  assert.equal((await createClient(url, publicKey, options).auth.signInWithPassword({ email: invitee.email, password })).error, null)
  pass('New invitation: repeated previews do not consume link; recipient gets a session, chooses password and signs in')
  phase = 'unconfirmed administrator password setup'
  const unconfirmed = await fixture(false, 'admin')
  const recovery = await link('recovery', unconfirmed)
  recovery.set('next', '//unrelated.example')
  const recoveryClient = await verify(recovery, '/update-password', unconfirmed.id)
  const newPassword = randomBytes(32).toString('base64url') + '!Aa9'
  await setPasswordThroughWebsite(recoveryClient, newPassword)
  assert.equal((await createClient(url, publicKey, options).auth.signInWithPassword({ email: unconfirmed.email, password: newPassword })).error, null)
  assert.equal((await admin.from('profiles').select('role').eq('id', unconfirmed.id).single()).data.role, 'admin')
  pass('New unconfirmed admin can use recovery, set a password and sign in; admin role is preserved')
  for (const [role, path] of [['student', '/dashboard'], ['tutor', '/bookings'], ['admin', '/admin']]) {
    phase = role + ' cross-device sign-in'
    const account = await fixture(true, role)
    const params = await link('magiclink', account)
    await verify(params, path, account.id)
    pass(role + ': fresh-browser sign-in succeeds without a sender-browser verifier; correct destination opens')
  }
  phase = 'email signup confirmation'
  const signup = await admin.auth.admin.generateLink({ type: 'signup', email: `account-email-signup-${randomUUID()}@example.invalid`, password: randomBytes(32).toString('base64url') + '!Aa9' })
  assert.ok(!signup.error && signup.data.user)
  ids.push(signup.data.user.id)
  await verify(new URLSearchParams({ token_hash: signup.data.properties.hashed_token, type: 'signup', next: '/pricing?signup=success' }), '/pricing?signup=success', signup.data.user.id)
  pass('Signup confirmation establishes a session and preserves the signup destination')
  phase = 'malformed and oversized requests'
  assert.equal((await request(new URLSearchParams({ type: 'sms', token_hash: 'a'.repeat(64) }), 'POST')).status, 400)
  assert.equal((await request(new URLSearchParams({ token_hash: 'a'.repeat(5000), type: 'invite' }), 'POST')).status, 413)
  pass('Foreign-origin submissions, malformed links, replayed links and oversized bodies are refused')
} catch (error) {
  failed = true
  // Assertion values can contain credentials; report only stage and numeric statuses.
  console.error('FAIL at ' + phase + (typeof error.actual === 'number' ? ` (actual status ${error.actual}, expected ${error.expected})` : '') + '; credentials and service responses omitted')
} finally {
  for (const id of ids) {
    if ((await admin.auth.admin.deleteUser(id)).error) { failed = true; console.error('Fixture cleanup required: ' + id) }
  }
  if (ids.length) pass('All disposable test accounts deleted; no emails sent')
  writeFileSync('.vercel/auth-email-hosted-checks.json', JSON.stringify({ app, passed: !failed, checks, fixtureIds: ids }, null, 2) + '\n')
}
if (failed) process.exitCode = 1
