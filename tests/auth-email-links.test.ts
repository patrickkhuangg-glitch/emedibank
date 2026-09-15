import test from 'node:test'
import assert from 'node:assert/strict'
import { accountEmailDestination, accountEmailHeaders, accountEmailPage, readAccountEmailLink } from '../src/lib/auth/email-links'
import { readFileSync } from 'node:fs'
const token = 'a'.repeat(64)
const parse = (type: string, next = '') => readAccountEmailLink(new URLSearchParams({ type, token_hash: token, next }))!
test('email purposes keep password setup and account changes on the right page', () => {
  for (const type of ['invite', 'recovery']) assert.equal(accountEmailDestination(parse(type, '/admin'), 'student'), '/update-password')
  assert.equal(accountEmailDestination(parse('email_change'), 'student'), '/account')
  assert.equal(accountEmailDestination(parse('signup', '/pricing?signup=success'), 'student'), '/pricing?signup=success')
  for (const [role, path] of [['admin', '/admin'], ['tutor', '/bookings'], ['student', '/dashboard']]) assert.equal(accountEmailDestination(parse('magiclink'), role), path)
})
test('untrusted destinations, malformed credentials and unknown types are refused', () => {
  for (const next of ['https://evil.example', '//evil.example', '/\\evil.example', '/%2f%2fevil.example', '/dashboard\r\nLocation: https://evil.example']) assert.equal(parse('magiclink', next).next, '')
  assert.equal(readAccountEmailLink(new URLSearchParams({ type: 'sms', token_hash: token })), null)
  assert.equal(readAccountEmailLink(new URLSearchParams({ type: 'invite', token_hash: '"><script>x</script>' })), null)
  assert.equal(readAccountEmailLink(new URLSearchParams({ code: token, token_hash: token })), null)
  assert.ok(readAccountEmailLink(new URLSearchParams({ code: 'abcde01234-01234-01234-01234', next: '/update-password' })))
})
test('landing page only consumes credentials through deliberate POST, with no external requests', () => {
  const html = accountEmailPage(parse('invite'))
  assert.match(html, /method="post"/)
  assert.match(html, /Continue to set password/)
  assert.doesNotMatch(html, /<script|<img|http-equiv="refresh"|https:\/\//)
  assert.match(accountEmailHeaders['Cache-Control'], /no-store/)
  assert.equal(accountEmailHeaders['Referrer-Policy'], 'strict-origin')
  assert.match(accountEmailPage(null, 'expired'), /expired or has already been used/)
  assert.doesNotMatch(accountEmailPage(null, 'expired'), /name="token_hash"/)
  for (const reason of ['request', 'unavailable'] as const) {
    assert.doesNotMatch(accountEmailPage(null, reason), /expired|name="token_hash"/)
    assert.match(accountEmailPage(null, reason), /try again/)
  }
})
test('all branded templates use cross-device token hashes instead of implicit auth redirects', () => {
  for (const name of ['invite', 'recovery', 'magic_link', 'confirmation']) {
    const html = readFileSync(new URL(`../supabase/templates/${name}.html`, import.meta.url), 'utf8')
    assert.match(html, /token_hash={{ .TokenHash }}/)
    assert.doesNotMatch(html, /ConfirmationURL|<script/)
    assert.match(html, /Part of EMeducate/)
    assert.match(html, /support@emeducate.com.au/)
  }
})
