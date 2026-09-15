import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe/client'

/** Trials can sit exams but do not unlock the paid report. Explicit comps do. */
export async function hasPaidMockReport(userId: string, examId: string): Promise<boolean> {
  const db = createAdminClient(), now = Date.now()
  const { data: grants, error } = await db.from('entitlements').select('source,expires_at').eq('user_id', userId).eq('exam_id', examId)
  if (error) throw error
  const live = (grants ?? []).filter(g => !g.expires_at || Date.parse(g.expires_at) > now)
  if (live.some(g => g.source === 'comp')) return true
  if (!live.length) return false
  const { data: subs, error: subError } = await db.from('subscriptions').select('status,current_period_end,product_id,stripe_subscription_id').eq('user_id', userId).in('status', ['active','past_due'])
  if (subError) throw subError
  const eligible = (subs ?? []).filter(s => !s.current_period_end || Date.parse(s.current_period_end) > now)
  if (!eligible.length) return false
  const { data: products, error: productError } = await db.from('products').select('id,stripe_product_id,kind,exam_id')
  if (productError) throw productError
  const covers = (p: {kind: string; exam_id: string | null}) => p.kind === 'bundle' || p.exam_id === examId
  for (const s of eligible) {
    if (products?.some(p => p.id === s.product_id && covers(p))) return true
    // Additional subscription items may cover this exam even when its first item does not.
    if (s.stripe_subscription_id) {
      const remote = await getStripe().subscriptions.retrieve(s.stripe_subscription_id)
      if (remote.status !== 'active' && remote.status !== 'past_due') continue
      if (remote.items.data.some(item => products?.some(p => p.stripe_product_id === (typeof item.price.product === 'string' ? item.price.product : item.price.product.id) && covers(p)))) return true
    }
  }
  return false
}
