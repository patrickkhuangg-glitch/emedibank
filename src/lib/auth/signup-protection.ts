import 'server-only'

import { createHmac } from 'node:crypto'
import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSupabaseSecretKey } from '@/lib/supabase/env'

const HOUR = 60 * 60
const MONTH = 30 * 24 * HOUR

export async function verifySignupProtection(email: string, turnstileToken: string) {
  const requestHeaders = await headers()
  const ip = clientIp(requestHeaders)
  const [ipAllowed, emailAllowed] = await Promise.all([
    consume('ip', ip, 4, MONTH),
    consume('email', email.toLowerCase(), 3, HOUR),
  ])
  if (!ipAllowed || !emailAllowed) return { error: 'Too many signup attempts. Please try again later.' }

  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    console.error('TURNSTILE_SECRET_KEY is not configured.')
    return { error: 'Signup protection is being configured. Please try again shortly.' }
  }
  if (!turnstileToken) return { error: 'Please complete the security check.' }

  try {
    const body = new URLSearchParams({ secret, response: turnstileToken, remoteip: ip })
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
      cache: 'no-store',
    })
    const result: unknown = await response.json()
    if (!isTurnstileSuccess(result)) return { error: 'The security check did not pass. Please try again.' }
  } catch {
    return { error: 'The security check is unavailable. Please try again shortly.' }
  }

  return { error: null }
}

export function normalisePhone(value: string) {
  const compact = value.trim().replace(/[\s()-]/g, '')
  const phone = /^0\d{9}$/.test(compact) ? `+61${compact.slice(1)}` : compact
  return /^\+[1-9]\d{7,14}$/.test(phone) ? phone : null
}

async function consume(namespace: string, value: string, limit: number, windowSeconds: number) {
  const keyHash = createHmac('sha256', getSupabaseSecretKey()).update(`${namespace}:${value}`).digest('hex')
  const { data, error } = await createAdminClient().rpc('consume_signup_attempt', {
    p_key_hash: keyHash,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  })
  if (error) {
    console.error('Signup rate limit could not be checked.', error)
    return false
  }
  return data === true
}

function clientIp(requestHeaders: Headers) {
  return requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() || requestHeaders.get('x-real-ip') || 'unknown'
}
function isTurnstileSuccess(value: unknown): value is { success: true } {
  return typeof value === 'object' && value !== null && 'success' in value && value.success === true
}
