import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadModule } from './helpers/load-module.mjs'

test('paid checkout skips trial allocation, preserves normal trials and blocks duplicate subscriptions', async () => {
  let trialCalls = 0, checkoutCalls = 0, existing: unknown[] = []
  let trialEnd: number | undefined
  const checkout = loadModule('src/lib/stripe/actions.ts', {
    'next/navigation': { redirect: (url: string) => { throw new Error(`redirect:${url}`) } },
    '@/lib/security/payments': { paymentsAvailable: () => true },
    './client': { getStripe: () => ({
      prices: { list: async () => ({ data: [{ id: 'price-year' }] }) },
      subscriptions: { list: async () => ({ data: existing, has_more: false }) },
      checkout: { sessions: { create: async (data: { subscription_data: { trial_end?: number } }) => { checkoutCalls++; trialEnd = data.subscription_data.trial_end; return { url: 'https://checkout.stripe.com/test' } } } },
    }) },
    './customer': { getOrCreateCustomerId: async () => 'customer' },
    './pricing': { CURRENCIES: ['aud'] },
    './trial': { getCheckoutTrialEnd: async () => { trialCalls++; return 1800000000 } },
    '@/lib/auth/dal': { getUser: async () => ({ id: 'user', email: 'synthetic@example.test' }), getProfile: async () => ({ full_name: 'Synthetic', phone_number: '000' }) },
    '@/lib/supabase/server': { createClient: async () => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 'plan', stripe_product_id: 'product' }, error: null }) }) }) }) }) },
    '@/lib/site': { getOrigin: async () => 'https://example.test' },
  }) as { startCheckoutAction: (data: FormData) => Promise<void> }
  const data = new FormData(); data.set('productId', 'plan'); data.set('checkoutMode', 'paid')
  await assert.rejects(checkout.startCheckoutAction(data), /redirect:https:\/\/checkout.stripe.com/)
  assert.equal(trialCalls, 0); assert.equal(trialEnd, undefined)
  data.delete('checkoutMode')
  await assert.rejects(checkout.startCheckoutAction(data), /redirect:https:\/\/checkout.stripe.com/)
  assert.equal(trialCalls, 1); assert.equal(trialEnd, 1800000000)
  data.set('checkoutMode', 'paid')
  for (const status of ['active', 'trialing', 'past_due', 'incomplete', 'paused']) {
    existing = [{ status, items: { data: [{ price: { id: 'price-month', product: 'product' } }] } }]
    await assert.rejects(checkout.startCheckoutAction(data), /existing_subscription/)
  }
  assert.equal(checkoutCalls, 2)
  existing = [{ status: 'canceled', items: { data: [{ price: { id: 'price-month', product: 'product' } }] } }]
  await assert.rejects(checkout.startCheckoutAction(data), /redirect:https:\/\/checkout.stripe.com/)
  assert.equal(checkoutCalls, 3); assert.equal(trialCalls, 1)
})
