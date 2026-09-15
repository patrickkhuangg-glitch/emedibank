'use server'

import { redirect } from 'next/navigation'
import { getUser, getProfile } from '@/lib/auth/dal'
import { interviewOfferById } from '@/lib/interviews/marketing'
import { paymentsAvailable } from '@/lib/security/payments'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrigin } from '@/lib/site'
import { getOrCreateCustomerId } from './customer'
import { getStripe } from './client'

export async function startInterviewPurchaseAction(formData: FormData) {
  if (!paymentsAvailable()) redirect('/interview-preparation?error=payments_unavailable#plans')

  const offer = interviewOfferById(String(formData.get('offerId') ?? ''))
  if (!offer) redirect('/interview-preparation?error=unknown_offer#plans')

  const user = await getUser()
  if (!user) redirect('/login?redirectTo=/interview-preparation%23plans')
  const profile = await getProfile()
  if (!profile?.full_name || !profile.phone_number) redirect('/account?complete=trial')

  if (offer.kind === 'credits') {
    const { data: hasAccess, error } = await createAdminClient().rpc('interview_full_access', { p_user: user.id })
    if (error || !hasAccess) redirect('/interview-preparation?error=paid_access_required#plans')
  }

  const stripe = getStripe()
  const prices = await stripe.prices.list({ active: true, lookup_keys: [offer.lookupKey], limit: 1 })
  const price = prices.data[0]
  if (!price || price.currency !== 'aud' || price.unit_amount !== offer.price * 100 || price.recurring) {
    redirect('/interview-preparation?error=offer_unavailable#plans')
  }

  const customerId = await getOrCreateCustomerId(user.id, user.email, profile.full_name)
  const origin = await getOrigin()
  const metadata = { supabase_user_id: user.id, interview_offer_id: offer.id }
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer: customerId,
    client_reference_id: user.id,
    payment_method_types: ['card'],
    line_items: [{ price: price.id, quantity: 1 }],
    consent_collection: { terms_of_service: 'required' },
    payment_intent_data: { metadata },
    metadata,
    success_url: `${origin}/account?checkout=success&purchase=${offer.id}`,
    cancel_url: `${origin}/interview-preparation?checkout=cancelled#plans`,
  })
  if (!session.url) redirect('/interview-preparation?error=checkout_failed#plans')
  redirect(session.url)
}
