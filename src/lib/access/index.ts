// The access layer — the single source of truth for "can this user reach this?".
//
// Every gate in the app funnels through here, server-side. It uses the
// service-role client so the answer is authoritative and can never be spoofed
// from the browser. The one question the app answers:
//
//   hasActiveEntitlement(userId, examId):
//     if the account's 7-day free trial is running: return true (every exam)
//     return an unexpired entitlement row exists for (user, exam)
//
// There is no free tier. New accounts get a 7-day trial (profiles.trial_ends_at,
// server-controlled); after that, access comes from the derived entitlements
// table, which the Stripe webhook keeps in sync (plus manual 'comp' grants).
import 'server-only'
import { cache } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'

/** When the account's free trial ends, or null (signed out / no profile).
 *  Cached per request. */
export const getTrialEndsAt = cache(async (
  userId: string | null | undefined,
): Promise<Date | null> => {
  if (!userId) return null
  const { data, error } = await createAdminClient()
    .from('profiles')
    .select('trial_ends_at')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return data?.trial_ends_at ? new Date(data.trial_ends_at) : null
})

const DAY_MS = 24 * 60 * 60 * 1000

/** Whole days left in a trial (rounded up), or 0 once it has ended. */
export function trialDaysLeft(endsAt: Date): number {
  const remainingMs = endsAt.getTime() - Date.now()
  return remainingMs > 0 ? Math.max(1, Math.ceil(remainingMs / DAY_MS)) : 0
}

/** True if an entitlement expiry is unset (never expires) or still ahead. */
export function isUnexpired(expiresAt: string | null): boolean {
  return !expiresAt || new Date(expiresAt).getTime() > Date.now()
}

/** True while the account's free trial is running. */
export async function isOnFreeTrial(userId: string | null | undefined): Promise<boolean> {
  const endsAt = await getTrialEndsAt(userId)
  return !!endsAt && endsAt.getTime() > Date.now()
}

/** True if the user holds any unexpired entitlement (paid or comp), regardless
 *  of trial. Cached per request. */
export const hasAnyPaidAccess = cache(async (userId: string | null | undefined): Promise<boolean> => {
  if (!userId) return false
  const { data, error } = await createAdminClient()
    .from('entitlements')
    .select('id')
    .eq('user_id', userId)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .limit(1)
  if (error) throw error
  return (data?.length ?? 0) > 0
})

/**
 * True if the user may use the exam: their free trial is running, or they hold
 * an active (unexpired) entitlement for it.
 * Entitlements are derived from subscriptions by the webhook; a row is only
 * "active" while it exists and has not passed its expires_at.
 *
 * Wrapped in React cache() so repeated checks for the same (user, exam) within a
 * single request (grading a session, rendering a gated page) hit the DB once.
 */
export const hasActiveEntitlement = cache(async (
  userId: string | null | undefined,
  examId: string,
): Promise<boolean> => {
  if (!userId) return false
  if (await isOnFreeTrial(userId)) return true

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
})

/** Subtest-level gate: the user must be able to use the subtest's exam. */
export async function canAccessSubtest(
  userId: string | null | undefined,
  subtestId: string,
): Promise<boolean> {
  const supabase = createAdminClient()

  const { data: subtest, error } = await supabase
    .from('subtests')
    .select('id, exam_id')
    .eq('id', subtestId)
    .maybeSingle()

  if (error) throw error
  if (!subtest) return false

  return hasActiveEntitlement(userId, subtest.exam_id)
}

/** Exam-level gate: trial or paid access to the whole exam. */
export async function canAccessExam(
  userId: string | null | undefined,
  examId: string,
): Promise<boolean> {
  return hasActiveEntitlement(userId, examId)
}

export type SectionAccess = {
  id: string
  slug: string
  name: string
  locked: boolean
}

/**
 * Per-section access for an exam, for lock indicators. Access is exam-wide, so
 * every section shares one check.
 */
export async function getSectionAccess(
  userId: string | null | undefined,
  examId: string,
): Promise<SectionAccess[]> {
  const supabase = createAdminClient()
  const [{ data: subs }, entitled] = await Promise.all([
    supabase
      .from('subtests')
      .select('id, slug, name, sort_order')
      .eq('exam_id', examId)
      .order('sort_order'),
    hasActiveEntitlement(userId, examId),
  ])
  return (subs ?? []).map((s) => ({
    id: s.id,
    slug: s.slug,
    name: s.name,
    locked: !entitled,
  }))
}
