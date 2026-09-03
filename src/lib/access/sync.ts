// Recompute a user's derived entitlements from their subscriptions.
//
// Called by the Stripe webhook after it writes a subscription row. Resolution:
//   per-exam subscription -> that one exam
//   all-access bundle     -> every exam
// Free access is never stored here (it lives on subtests.is_free). Manual 'comp'
// grants are preserved; only 'subscription'/'bundle' rows are managed by this sync.
import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe/client'
import type { EntitlementSource, SubscriptionStatus } from '@/lib/supabase/types'

// Statuses that grant access. past_due is included as a short grace window while
// Stripe retries payment; a subscription only loses access once 'canceled'.
const ACCESS_GRANTING_STATUSES = ['active', 'trialing', 'past_due'] as const satisfies readonly SubscriptionStatus[]
const MANAGED_SOURCES: EntitlementSource[] = ['subscription', 'bundle']

type DesiredEntitlement = {
  exam_id: string
  source: EntitlementSource
  expires_at: string | null
}

export async function syncEntitlementsForUser(userId: string): Promise<void> {
  const supabase = createAdminClient()

  // 1. Access-granting subscriptions for this user.
  const { data: subs, error: subErr } = await supabase
    .from('subscriptions')
    .select('product_id, stripe_subscription_id, current_period_end')
    .eq('user_id', userId)
    .in('status', [...ACCESS_GRANTING_STATUSES])
  if (subErr) throw subErr

  // 2. Resolve the referenced products.
  const stripeProductIds = new Set<string>()
  const productsBySubscription = new Map<string, string[]>()
  const stripe = getStripe()
  await Promise.all((subs ?? []).map(async (sub) => {
    if (!sub.stripe_subscription_id) return
    const remote = await stripe.subscriptions.retrieve(sub.stripe_subscription_id, {
      expand: ['items.data.price.product'],
    })
    const ids = remote.items.data.flatMap((item) => {
      const product = item.price.product
      const id = typeof product === 'string' ? product : product?.id
      return id ? [id] : []
    })
    productsBySubscription.set(sub.stripe_subscription_id, ids)
    ids.forEach((id) => stripeProductIds.add(id))
  }))

  const productIds = [...new Set((subs ?? []).map((s) => s.product_id).filter((v): v is string => !!v))]
  const productById = new Map<string, { kind: 'exam' | 'bundle'; exam_id: string | null }>()
  if (productIds.length > 0) {
    const { data: products, error: prodErr } = await supabase
      .from('products')
      .select('id, kind, exam_id')
      .in('id', productIds)
    if (prodErr) throw prodErr
    for (const p of products ?? []) productById.set(p.id, { kind: p.kind, exam_id: p.exam_id })
  }
  const localByStripeId = new Map<string, { kind: 'exam' | 'bundle'; exam_id: string | null }>()
  if (stripeProductIds.size > 0) {
    const { data: products, error: stripeProdErr } = await supabase
      .from('products')
      .select('stripe_product_id, kind, exam_id')
      .in('stripe_product_id', [...stripeProductIds])
    if (stripeProdErr) throw stripeProdErr
    for (const p of products ?? []) {
      if (p.stripe_product_id) localByStripeId.set(p.stripe_product_id, { kind: p.kind, exam_id: p.exam_id })
    }
  }

  // 3. Build the desired entitlement set, one row per exam (furthest expiry wins).
  const desired = new Map<string, DesiredEntitlement>()
  let allExamIds: string[] | null = null

  const add = (examId: string, source: EntitlementSource, expires: string | null) => {
    const existing = desired.get(examId)
    if (!existing) {
      desired.set(examId, { exam_id: examId, source, expires_at: expires })
      return
    }
    // null expiry ("never") always wins; otherwise keep the later date.
    if (existing.expires_at === null || expires === null) {
      desired.set(examId, { exam_id: examId, source, expires_at: null })
    } else if (new Date(expires) > new Date(existing.expires_at)) {
      desired.set(examId, { exam_id: examId, source, expires_at: expires })
    }
  }

  for (const sub of subs ?? []) {
    if (!sub.product_id) continue
    const itemProducts = sub.stripe_subscription_id
      ? (productsBySubscription.get(sub.stripe_subscription_id) ?? []).map((id) => localByStripeId.get(id)).filter((p): p is { kind: 'exam' | 'bundle'; exam_id: string | null } => !!p)
      : []
    const fallback = productById.get(sub.product_id)
    const resolvedProducts = itemProducts.length > 0 ? itemProducts : fallback ? [fallback] : []

    for (const product of resolvedProducts) {
      if (product.kind === 'bundle') {
        if (!allExamIds) {
          // All-access covers the three academic exams. Interviews remains an
          // optional add-on and is represented by its own subscription item.
          const { data: exams, error: examErr } = await supabase.from('exams').select('id').neq('kind', 'interview')
          if (examErr) throw examErr
          allExamIds = (exams ?? []).map((e) => e.id)
        }
        for (const examId of allExamIds) add(examId, 'bundle', sub.current_period_end)
      } else if (product.exam_id) {
        add(product.exam_id, 'subscription', sub.current_period_end)
      }
    }
  }

  // 4. Replace managed entitlements: wipe subscription/bundle rows, reinsert desired.
  //    Idempotent — Stripe retries re-run this to the same end state.
  const { error: delErr } = await supabase
    .from('entitlements')
    .delete()
    .eq('user_id', userId)
    .in('source', MANAGED_SOURCES)
  if (delErr) throw delErr

  if (desired.size > 0) {
    const rows = [...desired.values()].map((d) => ({ user_id: userId, ...d }))
    const { error: insErr } = await supabase.from('entitlements').insert(rows)
    if (insErr) throw insErr
  }
}
