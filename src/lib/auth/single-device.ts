import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

export async function claimSingleDeviceSession(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase.rpc('claim_single_device_session')
  if (error || data !== true) return false

  // Database validation blocks the previous session immediately. Revoking its
  // refresh token prevents it from returning after its current JWT expires.
  await supabase.auth.signOut({ scope: 'others' })
  return true
}
