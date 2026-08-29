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
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .maybeSingle()

  if (profile?.stripe_customer_id) return profile.stripe_customer_id

  const customer = await getStripe().customers.create({
    email: email || undefined,
    name: fullName || undefined,
    metadata: { supabase_user_id: userId },
  })
  await supabase
    .from('profiles')
    .update({ stripe_customer_id: customer.id })
    .eq('id', userId)
  return customer.id
}
