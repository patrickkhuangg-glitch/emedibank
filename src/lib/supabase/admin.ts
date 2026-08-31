// Privileged Supabase client using the secret/service_role key.
//
// This BYPASSES Row-Level Security. Use it only in trusted server code for
// admin tasks, never in anything reachable from the browser. The 'server-only'
// guard makes an accidental client import a build error, so the secret key can
// never be bundled into browser JS.
import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getSupabaseSecretKey, getSupabaseUrl } from './env'
import type { Database } from './types'

export function createAdminClient() {
  return createSupabaseClient<Database>(getSupabaseUrl(), getSupabaseSecretKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
