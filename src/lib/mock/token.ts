// Signed mock manifest. A mock is free (or entitlement-gated), so its question
// fetching/grading can't ride the normal paywalled path. Instead, when a mock
// starts, the server resolves the exact question set and signs it into an opaque
// HMAC token. Every fetch/grade call carries the token; the server verifies the
// signature, the owning user, expiry, and that the requested question is in the
// set — so a client can only ever reach the questions its own mock issued, never
// enumerate the paid bank.
import 'server-only'
import crypto from 'node:crypto'

const SECRET = process.env.SUPABASE_SECRET_KEY ?? 'insecure-dev-mock-secret'

export type MockManifest = {
  u: string // user id
  e: string // exam id
  q: string[] // allowed question ids
  x: number // expiry (epoch ms)
}

const DEFAULT_TTL_MS = 6 * 60 * 60 * 1000

function b64url(buf: Buffer): string {
  return buf.toString('base64url')
}

/** Sign a manifest, stamping an expiry ttlMs from now. */
export function signManifest(m: Omit<MockManifest, 'x'>, ttlMs: number = DEFAULT_TTL_MS): string {
  const full: MockManifest = { ...m, x: Date.now() + ttlMs }
  const payload = b64url(Buffer.from(JSON.stringify(full)))
  const sig = b64url(crypto.createHmac('sha256', SECRET).update(payload).digest())
  return `${payload}.${sig}`
}

/** Verify signature, expiry, and owner. Returns the manifest or null. */
export function verifyManifest(token: string, userId: string): MockManifest | null {
  const dot = token.indexOf('.')
  if (dot < 1) return null
  const payload = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const expected = b64url(crypto.createHmac('sha256', SECRET).update(payload).digest())
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null

  let m: MockManifest
  try {
    m = JSON.parse(Buffer.from(payload, 'base64url').toString())
  } catch {
    return null
  }
  if (m.u !== userId) return null
  if (typeof m.x !== 'number' || Date.now() > m.x) return null
  return m
}
