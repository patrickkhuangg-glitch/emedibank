import test from 'node:test'
import assert from 'node:assert/strict'
import { loadModule } from './helpers/load-module.mjs'

function loadCustomer(options: {
  storedId: string | null
  retrieve: (id: string) => Promise<Record<string, unknown>>
  create: (input: Record<string, unknown>, options: { idempotencyKey: string }) => Promise<{ id: string }>
  updates: Array<Record<string, unknown>>
}) {
  const database = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: { stripe_customer_id: options.storedId }, error: null }),
        }),
      }),
      update: (value: Record<string, unknown>) => ({
        eq: async () => {
          options.updates.push(value)
          return { error: null }
        },
      }),
    }),
  }

  return loadModule('src/lib/stripe/customer.ts', {
    './client': { getStripe: () => ({ customers: { retrieve: options.retrieve, create: options.create } }) },
    '@/lib/supabase/admin': { createAdminClient: () => database },
  }) as {
    getOrCreateCustomerId: (userId: string, email?: string, name?: string) => Promise<string>
  }
}

test('reuses a Stripe customer that exists in the active mode', async () => {
  let creates = 0
  const updates: Array<Record<string, unknown>> = []
  const customer = loadCustomer({
    storedId: 'cus_live_existing',
    retrieve: async () => ({ id: 'cus_live_existing' }),
    create: async () => { creates += 1; return { id: 'cus_unexpected' } },
    updates,
  })

  assert.equal(await customer.getOrCreateCustomerId('user-1', 'student@example.test', 'Student'), 'cus_live_existing')
  assert.equal(creates, 0)
  assert.deepEqual(updates, [])
})

test('repairs a stored test-mode customer id when live Stripe cannot find it', async () => {
  const updates: Array<Record<string, unknown>> = []
  let idempotencyKey = ''
  const customer = loadCustomer({
    storedId: 'cus_test_missing',
    retrieve: async () => { throw { code: 'resource_missing', param: 'customer' } },
    create: async (_input, options) => {
      idempotencyKey = options.idempotencyKey
      return { id: 'cus_live_repaired' }
    },
    updates,
  })

  assert.equal(await customer.getOrCreateCustomerId('user-2', 'student@example.test', 'Student'), 'cus_live_repaired')
  assert.equal(idempotencyKey, 'studocyte-customer-repair-user-2-cus_test_missing')
  assert.equal(updates.length, 1)
  assert.equal(updates[0]?.stripe_customer_id, 'cus_live_repaired')
})

test('does not hide unrelated Stripe customer errors', async () => {
  const updates: Array<Record<string, unknown>> = []
  const customer = loadCustomer({
    storedId: 'cus_live_existing',
    retrieve: async () => { throw { code: 'api_connection_error' } },
    create: async () => ({ id: 'cus_unexpected' }),
    updates,
  })

  await assert.rejects(
    customer.getOrCreateCustomerId('user-3', 'student@example.test', 'Student'),
    (error: unknown) => (error as { code?: string }).code === 'api_connection_error',
  )
  assert.deepEqual(updates, [])
})
