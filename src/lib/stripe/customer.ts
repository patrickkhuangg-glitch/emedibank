import 'server-only'
import { getStripe } from './client'
import { createAdminClient } from '@/lib/supabase/admin'

function isMissingCustomer(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const stripeError = error as { code?: unknown; param?: unknown }
  return stripeError.code === 'resource_missing' && stripeError.param === 'customer'
}

/** Return the user's Stripe customer id, creating (and storing) it on first use. */
export async function getOrCreateCustomerId(
  userId: string,
  email: string | undefined,
  fullName: string | null | undefined,
): Promise<string> {
  const supabase = createAdminClient()
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .maybeSingle()
  if (profileError || !profile) throw new Error('Your billing profile could not be loaded.')

  const stripe = getStripe()
  const storedCustomerId = profile.stripe_customer_id
  if (storedCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(storedCustomerId)
      if (!('deleted' in customer) || !customer.deleted) return customer.id
    } catch (error) {
      // A profile can retain a test-mode customer id after production switches
      // to live Stripe. Repair only that known mismatch; surface every other
      // Stripe failure rather than silently creating duplicate customers.
      if (!isMissingCustomer(error)) throw error
    }
  }

  const customer = await stripe.customers.create({
    email: email || undefined,
    name: fullName || undefined,
    metadata: { supabase_user_id: userId },
  }, {
    idempotencyKey: storedCustomerId
      ? `studocyte-customer-repair-${userId}-${storedCustomerId}`
      : `studocyte-customer-${userId}`,
  })
  const { error } = await supabase
    .from('profiles')
    .update({ stripe_customer_id: customer.id })
    .eq('id', userId)
  if (error) throw error
  return customer.id
}
