// Privileged Supabase client using the secret/service_role key.
//
// This BYPASSES Row-Level Security. Use it only in trusted server code for
// admin tasks, never in anything reachable from the browser. Not needed for the
// Phase 0 /status check, but wired up so later server jobs have it ready.
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getSupabaseSecretKey, getSupabaseUrl } from './env'
import type { Database } from './types'

export function createAdminClient() {
  return createSupabaseClient<Database>(getSupabaseUrl(), getSupabaseSecretKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
