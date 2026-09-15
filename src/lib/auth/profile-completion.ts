import type { Profile } from '@/lib/supabase/types'
import { homeForRole, safeInternalPath } from '@/lib/auth/roles'

export const COMPLETE_PROFILE_PATH = '/complete-profile'

type ProfileForEntry = Pick<Profile, 'phone_number' | 'role'>

export function hasRequiredPhone(profile: ProfileForEntry | null | undefined) {
  return Boolean(profile?.phone_number?.trim())
}

export function completionDestination(requestedPath?: string | null) {
  const next = safeInternalPath(requestedPath)
  if (!next || next.startsWith(COMPLETE_PROFILE_PATH)) return COMPLETE_PROFILE_PATH
  return `${COMPLETE_PROFILE_PATH}?next=${encodeURIComponent(next)}`
}

export function destinationAfterSignIn(
  profile: ProfileForEntry | null | undefined,
  requestedPath?: string | null,
) {
  if (!hasRequiredPhone(profile)) return completionDestination(requestedPath)
  return safeInternalPath(requestedPath) ?? homeForRole(profile?.role)
}
