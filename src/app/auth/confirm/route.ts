import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { accountEmailDestination, accountEmailHeaders, accountEmailPage, readAccountEmailLink, type AccountEmailFailure } from '@/lib/auth/email-links'

// Email scanners may follow GET links. Consume the single-use credential only
// after the recipient deliberately continues, in a same-origin form submission.
export function GET(request: Request) {
  const link = readAccountEmailLink(new URL(request.url).searchParams)
  return new NextResponse(accountEmailPage(link), {
    headers: { ...accountEmailHeaders, 'Content-Type': 'text/html; charset=utf-8' },
  })
}

export async function POST(request: Request) {
  const origin = new URL(request.url).origin
  const failure = (status: number, reason: AccountEmailFailure = 'request') => new NextResponse(accountEmailPage(null, reason), {
    status,
    headers: { ...accountEmailHeaders, 'Content-Type': 'text/html; charset=utf-8' },
  })
  if (request.headers.get('origin') !== origin || request.headers.get('sec-fetch-site') === 'cross-site') return failure(403)
  if (!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded')) return failure(415)
  // Bound the body while streaming, even if Content-Length is missing or false.
  const reader = request.body?.getReader()
  if (!reader) return failure(400)
  const chunks: Uint8Array[] = []
  let size = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > 4096) { await reader.cancel(); return failure(413) }
    chunks.push(value)
  }
  const body = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.length }
  const link = readAccountEmailLink(new URLSearchParams(new TextDecoder().decode(body)))
  if (!link) return failure(400)
  try {
    const supabase = await createClient()
    const result = link.code
      ? await supabase.auth.exchangeCodeForSession(link.code)
      : await supabase.auth.verifyOtp({ type: link.type, token_hash: link.tokenHash })
    if (result.error) {
      if (result.error.code === 'otp_expired') return failure(400, 'expired')
      return failure(result.error.status && result.error.status < 500 ? 400 : 503,
        result.error.status && result.error.status < 500 ? 'request' : 'unavailable')
    }
    if (!result.data.user) return failure(503, 'unavailable')
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', result.data.user.id).single()
    const response = NextResponse.redirect(new URL(accountEmailDestination(link, profile?.role ?? null), origin), 303)
    for (const [name, value] of Object.entries(accountEmailHeaders)) response.headers.set(name, value)
    return response
  } catch {
    return failure(503, 'unavailable')
  }
}
