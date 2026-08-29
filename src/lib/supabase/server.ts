// Supabase client for use in Server Components, Route Handlers and Server Actions.
//
// Reads/writes auth cookies via Next's async cookies() store. Writing cookies
// from a Server Component throws, so we swallow that case — token refresh then
// happens in middleware (added when auth lands in a later phase).
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseAnonKey, getSupabaseUrl } from './env'
import type { Database } from './types'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Called from a Server Component — safe to ignore when middleware
          // refreshes sessions. Relevant once auth is added.
        }
      },
    },
  })
}
