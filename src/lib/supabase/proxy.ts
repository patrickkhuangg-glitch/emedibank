// Refreshes the Supabase auth session on each request and applies an optimistic
// redirect for unauthenticated users hitting protected paths. Real authorization
// still lives in the server-side access layer + RLS — the proxy is just a fast gate.
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseAnonKey, getSupabaseUrl } from './env'
import type { Database } from './types'

// Paths that require a signed-in user. Free tier still needs an account.
const PROTECTED_PREFIXES = ['/app', '/dashboard', '/account', '/admin', '/exams', '/practice', '/mock', '/session', '/bookings', '/study-plan', '/students', '/interviews']

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          response = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
        },
      },
    },
  )

  // Do not run code between creating the client and getUser() — it refreshes tokens.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )
  const isApi = pathname === '/api' || pathname.startsWith('/api/')

  if (user) {
    const { data: currentDevice, error: deviceError } = await supabase.rpc('is_current_device_session')
    if (deviceError && (isProtected || isApi)) {
      return copyCookies(response, NextResponse.json({ error: 'Session validation is temporarily unavailable.' }, { status: 503 }))
    }
    if (!deviceError && currentDevice !== true) {
      await supabase.auth.signOut({ scope: 'local' })
      if (isApi) return copyCookies(response, NextResponse.json({ error: 'This account was signed in on another device.' }, { status: 401 }))
      if (!isProtected) return response
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.search = ''
      url.searchParams.set('error', 'session_replaced')
      url.searchParams.set('redirectTo', `${pathname}${request.nextUrl.search}`)
      return copyCookies(response, NextResponse.redirect(url))
    }
  }

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  return response
}

function copyCookies(source: NextResponse, target: NextResponse) {
  for (const cookie of source.cookies.getAll()) target.cookies.set(cookie)
  return target
}
