import test from 'node:test'
import assert from 'node:assert/strict'
import Stripe from 'stripe'
import { loadModule } from './helpers/load-module.mjs'

function subscription(status: string) {
  return {
    id: `sub-${status}`,
    status,
    customer: 'customer',
    metadata: { supabase_user_id: 'user' },
    items: {
      data: [{
        current_period_end: 1_800_000_000,
        price: { id: 'price-year', product: 'product' },
      }],
    },
  }
}

test('subscription lifecycle maps Stripe status to access state and recomputes entitlements every time', async () => {
  const writes: Array<Record<string, unknown>> = []
  const syncs: string[] = []
  const database = {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: table === 'profiles' ? { id: 'user' } : { id: 'product-row' },
            error: null,
          }),
        }),
      }),
      upsert: async (value: Record<string, unknown>) => { writes.push(value); return { error: null } },
    }),
  }
  const lifecycle = loadModule('src/lib/stripe/sync-subscription.ts', {
    '@/lib/supabase/admin': { createAdminClient: () => database },
    '@/lib/access/sync': { syncEntitlementsForUser: async (userId: string) => syncs.push(userId) },
    '@/lib/supabase/types': {},
  }) as { upsertSubscriptionFromStripe: (value: ReturnType<typeof subscription>) => Promise<void> }

  const cases = [
    ['active', 'active'],
    ['trialing', 'trialing'],
    ['past_due', 'past_due'],
    ['canceled', 'canceled'],
    ['unpaid', 'canceled'],
    ['incomplete', 'canceled'],
    ['incomplete_expired', 'canceled'],
    ['paused', 'canceled'],
  ]
  for (const [stripeStatus, storedStatus] of cases) {
    await lifecycle.upsertSubscriptionFromStripe(subscription(stripeStatus))
    assert.equal(writes.at(-1)?.status, storedStatus)
  }
  assert.equal(syncs.length, cases.length)
  assert(syncs.every((userId) => userId === 'user'))
})

test('created, updated, deleted and failed-payment webhooks all fetch current Stripe state before syncing', async () => {
  const stripe = new Stripe('sk_test_fixture')
  const secret = 'fixture-signing-secret'
  const retrieved: string[] = []
  const synced: string[] = []
  stripe.subscriptions.retrieve = async (id) => {
    retrieved.push(String(id))
    return subscription('canceled') as never
  }
  const { POST } = loadModule('src/app/api/stripe/webhook/route.ts', {
    'next/server': { NextResponse: Response },
    '@/lib/stripe/client': { getStripe: () => stripe },
    '@/lib/stripe/env': { getStripeWebhookSecret: () => secret },
    '@/lib/stripe/sync-subscription': { upsertSubscriptionFromStripe: async (sub: { id: string }) => synced.push(sub.id) },
    '@/lib/stripe/interview-purchase': { fulfilInterviewPurchase: async () => undefined },
  }, { process: { env: { APP_ENV: 'staging' } } }) as { POST: (request: Request) => Promise<Response> }

  async function send(type: string, object: Record<string, unknown>) {
    const event = { id: `evt-${type}`, object: 'event', livemode: false, type, data: { object } }
    const payload = JSON.stringify(event)
    return POST(new Request('https://staging.example/api/stripe/webhook', {
      method: 'POST',
      body: payload,
      headers: { 'stripe-signature': stripe.webhooks.generateTestHeaderString({ payload, secret }) },
    }))
  }

  for (const type of ['customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted']) {
    assert.equal((await send(type, { id: `sub-${type}` })).status, 200)
  }
  assert.equal((await send('invoice.payment_failed', {
    id: 'invoice-failed',
    parent: { subscription_details: { subscription: 'sub-failed-payment' } },
  })).status, 200)
  assert.deepEqual(retrieved, [
    'sub-customer.subscription.created',
    'sub-customer.subscription.updated',
    'sub-customer.subscription.deleted',
    'sub-failed-payment',
  ])
  assert.equal(synced.length, 4)
})

test('Manage billing opens a Stripe customer portal session that returns to the account page', async () => {
  let portalInput: Record<string, unknown> | undefined
  const actions = loadModule('src/lib/stripe/actions.ts', {
    'next/navigation': { redirect: (url: string) => { throw new Error(`redirect:${url}`) } },
    '@/lib/security/payments': { paymentsAvailable: () => true },
    './client': { getStripe: () => ({
      billingPortal: { sessions: { create: async (input: Record<string, unknown>) => {
        portalInput = input
        return { url: 'https://billing.stripe.test/session' }
      } } },
    }) },
    './customer': {},
    './pricing': { CURRENCIES: ['aud'] },
    './trial': {},
    '@/lib/auth/dal': {
      getUser: async () => ({ id: 'user' }),
      getProfile: async () => ({ stripe_customer_id: 'customer' }),
    },
    '@/lib/supabase/server': {},
    '@/lib/site': { getOrigin: async () => 'https://staging.example' },
  }) as { openBillingPortalAction: () => Promise<void> }

  await assert.rejects(actions.openBillingPortalAction(), /redirect:https:\/\/billing\.stripe\.test\/session/)
  assert.equal(portalInput?.customer, 'customer')
  assert.equal(portalInput?.return_url, 'https://staging.example/account')
})
