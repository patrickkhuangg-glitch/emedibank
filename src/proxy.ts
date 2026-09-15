import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'
import { contentSecurityPolicy } from '@/lib/security/headers'
import { allowsRequestOrigin } from '@/lib/security/origin'
import { isPublicProduction } from '@/lib/deployment-environment'

export async function proxy(request: NextRequest) {
  if (!allowsRequestOrigin(request, process.env.NEXT_PUBLIC_SITE_URL)) {
    return NextResponse.json({ error: 'Request origin is not allowed.' }, { status: 403 })
  }
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const csp = contentSecurityPolicy(nonce, process.env.NODE_ENV === 'development')
  // Replace any caller-provided nonce/CSP before Next renders inline scripts.
  request.headers.set('x-nonce', nonce)
  request.headers.set('Content-Security-Policy', csp)
  const response = await updateSession(request)
  response.headers.set('Content-Security-Policy', csp)
  response.headers.set('Cache-Control', 'private, no-store')
  if (!isPublicProduction()) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive')
  }
  return response
}

export const config = {
  // Run on everything except static assets and image files.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
