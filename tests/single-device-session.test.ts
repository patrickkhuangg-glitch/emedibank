import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { claimSingleDeviceSession } from '../src/lib/auth/single-device'

test('a successful sign-in claims the current session before revoking other refresh sessions', async () => {
  const calls: string[] = []
  const client = {
    rpc: async (name: string) => { calls.push(name); return { data: true, error: null } },
    auth: { signOut: async (options: { scope: string }) => { calls.push(`signOut:${options.scope}`); return { error: null } } },
  }
  assert.equal(await claimSingleDeviceSession(client as never), true)
  assert.deepEqual(calls, ['claim_single_device_session', 'signOut:others'])
})

test('a failed session claim never revokes another device', async () => {
  let revoked = false
  const client = {
    rpc: async () => ({ data: false, error: { message: 'unavailable' } }),
    auth: { signOut: async () => { revoked = true; return { error: null } } },
  }
  assert.equal(await claimSingleDeviceSession(client as never), false)
  assert.equal(revoked, false)
})

test('the database gate adopts one existing session and never lets an older session overwrite it', () => {
  const migration = readFileSync(new URL('../supabase/migrations/0070_single_device_sessions.sql', import.meta.url), 'utf8')
  assert.match(migration, /on conflict\(user_id\) do update[\s\S]*session_id=excluded\.session_id/)
  assert.match(migration, /is_current_device_session[\s\S]*on conflict\(user_id\) do nothing/)
  assert.match(migration, /where user_id=actor and session_id=current_session/)
  assert.match(migration, /revoke all on public\.account_active_sessions from public, anon, authenticated/)
})
