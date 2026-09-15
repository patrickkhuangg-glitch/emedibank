import 'server-only'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const ADMIN_MFA_PATH = '/admin/mfa'

export async function adminMfaIsVerified() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  return !error && data.currentLevel === 'aal2'
}

export async function requireAdminMfa() {
  if (!await adminMfaIsVerified()) redirect(ADMIN_MFA_PATH)
}
