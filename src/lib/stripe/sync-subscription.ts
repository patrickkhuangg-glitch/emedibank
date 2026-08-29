import 'server-only'
import type Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncEntitlementsForUser } from '@/lib/access/sync'
import type { SubscriptionStatus } from '@/lib/supabase/types'

function toStatus(s: Stripe.Subscription.Status): SubscriptionStatus {
  switch (s) {
    case 'active':
      return 'active'
    case 'trialing':
      return 'trialing'
    case 'past_due':
      return 'past_due'
    default:
      // canceled, unpaid, incomplete, incomplete_expired, paused -> no access
      return 'canceled'
  }
}

function periodEndIso(sub: Stripe.Subscription): string | null {
  // `current_period_end` has lived at both the subscription and item level across
  // API versions; read whichever is present.
  const top = (sub as unknown as { current_period_end?: number }).current_period_end
  const item = sub.items?.data?.[0]?.current_period_end
  const ts = top ?? item
  return ts ? new Date(ts * 1000).toISOString() : null
}

function idOf(ref: string | { id: string } | null | undefined): string | null {
  if (!ref) return null
  return typeof ref === 'string' ? ref : ref.id
}

/** Upsert the subscription row from Stripe and recompute the user's entitlements. */
export async function upsertSubscriptionFromStripe(sub: Stripe.Subscription): Promise<void> {
  const supabase = createAdminClient()

  // Resolve the owning user: prefer subscription metadata, fall back to the
  // customer -> profile mapping.
  let userId: string | null = sub.metadata?.supabase_user_id ?? null
  const customerId = idOf(sub.customer as string | { id: string })
  if (!userId && customerId) {
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle()
    userId = data?.id ?? null
  }
  if (!userId) return // cannot map to a user — nothing to record

  // Resolve our product from the subscription's price.
  const item = sub.items.data[0]
  const priceId = item?.price?.id ?? null
  const stripeProductId = idOf(item?.price?.product as string | { id: string })
  let productId: string | null = null
  if (stripeProductId) {
    const { data: product } = await supabase
      .from('products')
      .select('id')
      .eq('stripe_product_id', stripeProductId)
      .maybeSingle()
    productId = product?.id ?? null
  }

  await supabase.from('subscriptions').upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      status: toStatus(sub.status),
      current_period_end: periodEndIso(sub),
      price_id: priceId,
      product_id: productId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'stripe_subscription_id' },
  )

  await syncEntitlementsForUser(userId)
}
