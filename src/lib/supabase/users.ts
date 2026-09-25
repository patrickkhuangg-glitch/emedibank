// Admin helpers for auth accounts. auth.admin.listUsers() returns one page (max
// 1,000); reading a single page silently misses every account beyond it.
import 'server-only'
import type { User } from '@supabase/supabase-js'
import { createAdminClient } from './admin'

const PER_PAGE = 1000
const MAX_PAGES = 100

/** Every auth account, across all pages. */
export async function listAllAuthUsers(): Promise<{ users: User[]; error: Error | null }> {
  const admin = createAdminClient()
  const users: User[] = []
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PER_PAGE })
    if (error) return { users, error }
    users.push(...data.users)
    if (data.users.length < PER_PAGE) break
  }
  return { users, error: null }
}

/** The auth account id for an email (case-insensitive), or null. */
export async function findUserIdByEmail(email: string): Promise<string | null> {
  const { data, error } = await createAdminClient().rpc('find_user_id_by_email', { p_email: email })
  if (error) throw error
  return data ?? null
}

/** Split ids for `.in()` filters so large lists don't overflow the request URL. */
export function chunk<T>(items: T[], size = 200): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size))
  return chunks
}
