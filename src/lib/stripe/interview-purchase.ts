import 'server-only'
import type Stripe from 'stripe'
import { interviewOfferById } from '@/lib/interviews/marketing'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from './client'

function idOf(value: string | { id: string } | null | undefined) {
  if (!value) return null
  return typeof value === 'string' ? value : value.id
}

/** Verify and atomically fulfil a paid one-off Interview plan or credit pack. */
export async function fulfilInterviewPurchase(session: Stripe.Checkout.Session): Promise<void> {
  if (session.mode !== 'payment' || session.payment_status !== 'paid') return

  const userId = session.metadata?.supabase_user_id
  const offer = interviewOfferById(session.metadata?.interview_offer_id ?? '')
  const customerId = idOf(session.customer as string | { id: string } | null)
  if (!userId || !offer || !customerId) throw new Error('Interview purchase metadata missing')
  if (session.client_reference_id && session.client_reference_id !== userId) {
    throw new Error('Interview purchase owner mismatch')
  }

  const database = createAdminClient()
  const { data: owner, error: ownerError } = await database
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()
  if (ownerError) throw ownerError
  if (!owner || owner.id !== userId) throw new Error('Interview purchase owner mismatch')

  const lineItems = await getStripe().checkout.sessions.listLineItems(session.id, {
    limit: 2,
    expand: ['data.price.product'],
  })
  if (lineItems.has_more || lineItems.data.length !== 1) throw new Error('Interview purchase line items invalid')
  const price = lineItems.data[0]?.price
  if (!price || price.lookup_key !== offer.lookupKey || price.currency !== 'aud'
    || price.unit_amount !== offer.price * 100 || price.recurring) {
    throw new Error('Interview purchase price mismatch')
  }

  const { error } = await database.rpc('grant_interview_purchase', {
    p_user_id: userId,
    p_checkout_session_id: session.id,
    p_price_id: price.id,
    p_offer_id: offer.id,
    p_offer_kind: offer.kind,
    p_credits: offer.credits,
    p_access_days: offer.accessDays,
    p_amount_minor: offer.price * 100,
    p_currency: 'aud',
  })
  if (error) throw error
}
