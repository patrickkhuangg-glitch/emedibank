import 'server-only'
import { getStripe } from './client'
import { createAdminClient } from '@/lib/supabase/admin'

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

  if (profile?.stripe_customer_id) return profile.stripe_customer_id

  const customer = await getStripe().customers.create({
    email: email || undefined,
    name: fullName || undefined,
    metadata: { supabase_user_id: userId },
  }, { idempotencyKey: `studocyte-customer-${userId}` })
  const { error } = await supabase
    .from('profiles')
    .update({ stripe_customer_id: customer.id })
    .eq('id', userId)
  if (error) throw error
  return customer.id
}
