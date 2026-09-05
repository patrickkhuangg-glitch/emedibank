import type { UserRole } from '@/lib/supabase/types'

export function homeForRole(role: UserRole | null | undefined) {
  if (role === 'admin') return '/admin'
  if (role === 'tutor') return '/bookings'
  return '/dashboard'
}

export function safeInternalPath(value: string | null | undefined) {
  return value?.startsWith('/') && !value.startsWith('//') ? value : null
}
