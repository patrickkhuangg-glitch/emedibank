// The access layer — the single source of truth for "can this user reach this?".
//
// Every gate in the app funnels through here, server-side. It uses the
// service-role client so the answer is authoritative and can never be spoofed
// from the browser. The one question the app answers:
//
//   canAccessSubtest(userId, subtestId):
//     subtest = load(subtestId)
//     if subtest.is_free: return true
//     return hasActiveEntitlement(userId, subtest.exam_id)
//
// Free access is read live from subtests.is_free (an admin toggle changes it for
// every free user instantly). Paid access is read from the derived entitlements
// table, which the Stripe webhook keeps in sync.
import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * True if the user holds an active (unexpired) entitlement for the exam.
 * Entitlements are derived from subscriptions by the webhook; a row is only
 * "active" while it exists and has not passed its expires_at.
 */
export async function hasActiveEntitlement(
  userId: string | null | undefined,
  examId: string,
): Promise<boolean> {
  if (!userId) return false

  const supabase = createAdminClient()
  const nowIso = new Date().toISOString()

  const { data, error } = await supabase
    .from('entitlements')
    .select('id, expires_at')
    .eq('user_id', userId)
    .eq('exam_id', examId)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .limit(1)

  if (error) throw error
  return (data?.length ?? 0) > 0
}

/**
 * The core gate. Free subtests are open to any signed-up user (route protection
 * enforces sign-in); otherwise the user must be entitled to the subtest's exam.
 */
export async function canAccessSubtest(
  userId: string | null | undefined,
  subtestId: string,
): Promise<boolean> {
  const supabase = createAdminClient()

  const { data: subtest, error } = await supabase
    .from('subtests')
    .select('id, exam_id, is_free')
    .eq('id', subtestId)
    .maybeSingle()

  if (error) throw error
  if (!subtest) return false
  if (subtest.is_free) return true

  return hasActiveEntitlement(userId, subtest.exam_id)
}

/**
 * Exam-level gate: does the user hold full (paid) access to the whole exam?
 * Free subtests remain reachable via canAccessSubtest regardless of this.
 */
export async function canAccessExam(
  userId: string | null | undefined,
  examId: string,
): Promise<boolean> {
  return hasActiveEntitlement(userId, examId)
}
