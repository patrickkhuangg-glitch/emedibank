// Server-side data-access layer for identity. Pages and actions call these to get
// the current user/profile and to enforce auth — never trust the client for this.
import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Profile, InterfaceMode } from '@/lib/supabase/types'

/** The current authenticated user, or null. Cached per request. */
export const getUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})

/** Require a signed-in user; redirect to login otherwise. Returns the user. */
export async function requireUser(redirectTo?: string) {
  const user = await getUser()
  if (!user) {
    const target = redirectTo ? `/login?redirectTo=${encodeURIComponent(redirectTo)}` : '/login'
    redirect(target)
  }
  return user
}

/** The current user's profile row (role, name), or null if not signed in. */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser()
  if (!user) return null
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()
  return data
})

/** True if the current user is an admin. */
export async function isAdmin(): Promise<boolean> {
  const profile = await getProfile()
  return profile?.role === 'admin'
}

/** The current user's interface style. Defaults to 'playful' for signed-out users
 *  and gracefully before the interface_mode column exists. */
export async function getInterfaceMode(): Promise<InterfaceMode> {
  const profile = await getProfile()
  return profile?.interface_mode ?? 'playful'
}

/** Require an admin; redirect non-admins to the dashboard. */
export async function requireAdmin() {
  const profile = await getProfile()
  if (!profile) redirect('/login?redirectTo=/admin')
  if (profile.role !== 'admin') redirect('/dashboard')
  return profile
}

/** Require a tutor or admin. Students are returned to their own dashboard. */
export async function requireStaff(redirectTo = '/students') {
  const profile = await getProfile()
  if (!profile) redirect(`/login?redirectTo=${encodeURIComponent(redirectTo)}`)
  if (profile.role !== 'tutor' && profile.role !== 'admin') redirect('/dashboard')
  return profile
}
