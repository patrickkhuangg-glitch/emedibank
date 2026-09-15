import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadModule } from './helpers/load-module.mjs'

type BenefitCall = {
  p_user_id: string
  p_stripe_subscription_id: string
  p_benefit: string
  p_period_end: string
  p_amount: number
}

function subscription(interval: 'month' | 'year') {
  return {
    id: `sub-${interval}`,
    status: 'active',
    customer: 'customer',
    metadata: { supabase_user_id: 'user' },
    items: {
      data: [{
        current_period_end: 1_800_000_000,
        price: { id: `price-${interval}`, product: 'interviews-product', recurring: { interval } },
      }],
    },
  }
}

test('annual subscriptions do not grant interview or essay marking credits', async () => {
  const benefits: BenefitCall[] = []
  const database = {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: table === 'profiles' ? { id: 'user' } : { id: 'interviews-plan' },
            error: null,
          }),
        }),
      }),
      upsert: async () => ({ error: null }),
    }),
    rpc: async (_name: string, args: BenefitCall) => {
      benefits.push(args)
      return { error: null }
    },
  }
  const synced: string[] = []
  const subscriptionSync = loadModule('src/lib/stripe/sync-subscription.ts', {
    '@/lib/supabase/admin': { createAdminClient: () => database },
    '@/lib/access/sync': { syncEntitlementsForUser: async (userId: string) => synced.push(userId) },
    '@/lib/supabase/types': {},
  }) as { upsertSubscriptionFromStripe: (value: ReturnType<typeof subscription>) => Promise<void> }

  await subscriptionSync.upsertSubscriptionFromStripe(subscription('year'))

  assert.equal(synced.length, 1)
  assert.equal(benefits.length, 0)
})

test('monthly subscriptions do not receive annual marking credits', async () => {
  const benefits: BenefitCall[] = []
  const database = {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: table === 'profiles' ? { id: 'user' } : { id: 'interviews-plan' },
            error: null,
          }),
        }),
      }),
      upsert: async () => ({ error: null }),
    }),
    rpc: async (_name: string, args: BenefitCall) => {
      benefits.push(args)
      return { error: null }
    },
  }
  const subscriptionSync = loadModule('src/lib/stripe/sync-subscription.ts', {
    '@/lib/supabase/admin': { createAdminClient: () => database },
    '@/lib/access/sync': { syncEntitlementsForUser: async () => undefined },
    '@/lib/supabase/types': {},
  }) as { upsertSubscriptionFromStripe: (value: ReturnType<typeof subscription>) => Promise<void> }

  await subscriptionSync.upsertSubscriptionFromStripe(subscription('month'))

  assert.equal(benefits.length, 0)
})
