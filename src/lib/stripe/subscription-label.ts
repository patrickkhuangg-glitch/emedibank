import type { SubscriptionStatus } from '@/lib/supabase/types'

const RENEWING_STATUSES: readonly SubscriptionStatus[] = ['active', 'trialing', 'past_due']

export function subscriptionPeriodLabel(
  status: SubscriptionStatus,
  currentPeriodEnd: string | null,
) {
  if (!RENEWING_STATUSES.includes(status)) return 'No renewal'
  return currentPeriodEnd
    ? `Renews ${new Date(currentPeriodEnd).toLocaleDateString()}`
    : 'Renewal date unavailable'
}
