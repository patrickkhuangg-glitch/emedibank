import { test } from 'node:test'
import assert from 'node:assert/strict'
import { INTERVIEW_MARKETING, interviewOfferById } from '../src/lib/interviews/marketing'
import { loadModule } from './helpers/load-module.mjs'
import { fullDatabase } from './helpers/full-database.mjs'

test('Interview catalogue matches the approved plans and add-ons', () => {
  assert.deepEqual(INTERVIEW_MARKETING.plans.map(({ id, price, credits }) => ({ id, price, credits })), [
    { id: 'core', price: 199, credits: 6 },
    { id: 'pro', price: 349, credits: 18 },
    { id: 'intensive', price: 599, credits: 36 },
  ])
  assert.deepEqual(INTERVIEW_MARKETING.extras.map(({ id, price, credits }) => ({ id, price, credits })), [
    { id: 'credits-6', price: 99, credits: 6 },
    { id: 'credits-12', price: 189, credits: 12 },
    { id: 'credits-24', price: 359, credits: 24 },
  ])
})

test('paid Core checkout fulfils exactly six Interview credits and one year of access', async () => {
  const calls: Array<Record<string, unknown>> = []
  const database = {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: { id: 'user' }, error: null }) }),
      }),
    }),
    rpc: async (_name: string, args: Record<string, unknown>) => {
      calls.push(args)
      return { error: null }
    },
  }
  const purchase = loadModule('src/lib/stripe/interview-purchase.ts', {
    '@/lib/interviews/marketing': { interviewOfferById },
    '@/lib/supabase/admin': { createAdminClient: () => database },
    './client': { getStripe: () => ({ checkout: { sessions: { listLineItems: async () => ({
      has_more: false,
      data: [{ price: { id: 'price-core', lookup_key: 'studocyte_interview_core_aud_2026', currency: 'aud', unit_amount: 19_900, recurring: null } }],
    }) } } }) },
  }) as { fulfilInterviewPurchase: (session: Record<string, unknown>) => Promise<void> }

  await purchase.fulfilInterviewPurchase({
    id: 'cs_test_core',
    mode: 'payment',
    payment_status: 'paid',
    customer: 'customer',
    client_reference_id: 'user',
    metadata: { supabase_user_id: 'user', interview_offer_id: 'core' },
  })

  assert.equal(calls.length, 1)
  assert.equal(calls[0].p_offer_id, 'core')
  assert.equal(calls[0].p_offer_kind, 'plan')
  assert.equal(calls[0].p_credits, 6)
  assert.equal(calls[0].p_access_days, 365)
  assert.equal(calls[0].p_amount_minor, 19_900)
  assert.equal(calls[0].p_currency, 'aud')
})

test('fulfilment rejects a Stripe price that does not match the selected offer', async () => {
  let granted = false
  const database = {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: { id: 'user' }, error: null }) }),
      }),
    }),
    rpc: async () => { granted = true; return { error: null } },
  }
  const purchase = loadModule('src/lib/stripe/interview-purchase.ts', {
    '@/lib/interviews/marketing': { interviewOfferById },
    '@/lib/supabase/admin': { createAdminClient: () => database },
    './client': { getStripe: () => ({ checkout: { sessions: { listLineItems: async () => ({
      has_more: false,
      data: [{ price: { id: 'wrong', lookup_key: 'wrong', currency: 'aud', unit_amount: 19_900, recurring: null } }],
    }) } } }) },
  }) as { fulfilInterviewPurchase: (session: Record<string, unknown>) => Promise<void> }

  await assert.rejects(() => purchase.fulfilInterviewPurchase({
    id: 'cs_test_wrong', mode: 'payment', payment_status: 'paid', customer: 'customer',
    client_reference_id: 'user', metadata: { supabase_user_id: 'user', interview_offer_id: 'core' },
  }), /price mismatch/)
  assert.equal(granted, false)
})

test('database grants each paid checkout once and restricts add-ons to paid accounts', async (context) => {
  const database = await fullDatabase()
  context.after(() => database.close())
  const paidUser = crypto.randomUUID()
  const freeUser = crypto.randomUUID()
  await database.query("insert into auth.users(id,email) values($1,'paid@example.test'),($2,'free@example.test')", [paidUser, freeUser])

  const grant = async (userId: string, sessionId: string, offerId: string, kind: 'plan' | 'credits', credits: number, accessDays: number, amount: number) => {
    const result = await database.query(
      'select public.grant_interview_purchase($1,$2,$3,$4,$5,$6,$7,$8,$9) granted',
      [userId, sessionId, `price-${offerId}`, offerId, kind, credits, accessDays, amount, 'aud'],
    )
    return (result.rows as Array<{ granted: boolean }>)[0].granted
  }

  assert.equal(await grant(paidUser, 'cs_core', 'core', 'plan', 6, 365, 19_900), true)
  assert.equal(await grant(paidUser, 'cs_core', 'core', 'plan', 6, 365, 19_900), false)
  assert.equal(await grant(paidUser, 'cs_extra', 'credits-12', 'credits', 12, 0, 18_900), true)
  await assert.rejects(() => grant(freeUser, 'cs_free_extra', 'credits-6', 'credits', 6, 0, 9_900), /Paid Interview access is required/)

  const profile = (await database.query('select mmi_credits from public.profiles where id=$1', [paidUser])).rows as Array<{ mmi_credits: number }>
  const purchases = (await database.query('select count(*)::int count from public.interview_purchase_grants where user_id=$1', [paidUser])).rows as Array<{ count: number }>
  const accessRows = (await database.query("select expires_at from public.entitlements where user_id=$1 and source='purchase'", [paidUser])).rows as Array<{ expires_at: string }>
  assert.equal(profile[0].mmi_credits, 18)
  assert.equal(purchases[0].count, 2)
  const access = accessRows[0]
  assert.ok(new Date(access.expires_at).getTime() > Date.now() + 364 * 24 * 60 * 60 * 1000)
})
