import type { UserRole } from '@/lib/supabase/types'

export function homeForRole(role: UserRole | null | undefined) {
  if (role === 'admin') return '/admin'
  if (role === 'tutor') return '/bookings'
  return '/dashboard'
}

export function safeInternalPath(value: string | null | undefined) {
  if (!value?.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(value)) return null
  try {
    const base = 'https://internal.invalid'
    const url = new URL(value, base)
    const decodedPath = decodeURIComponent(url.pathname)
    if (url.origin !== base || decodedPath.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(decodedPath)) return null
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return null
  }
}
