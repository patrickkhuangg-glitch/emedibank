import 'server-only'

import { getProfile } from '@/lib/auth/dal'
import { hasActiveEntitlement } from '@/lib/access'
import { createAdminClient } from '@/lib/supabase/admin'

/** Interviews needs the account's free trial or an active entitlement to the
 *  interview exam (the Interviews subscription, the annual promotion, or a comp
 *  grant). Staff (tutors and admins) always have access to review and preview. */
export async function canUseInterviews(userId: string): Promise<boolean> {
  const profile = await getProfile()
  if (profile?.role === 'admin' || profile?.role === 'tutor') return true
  const { data: exam } = await createAdminClient()
    .from('exams')
    .select('id')
    .eq('kind', 'interview')
    .limit(1)
    .maybeSingle()
  if (!exam) return false
  return hasActiveEntitlement(userId, exam.id)
}
