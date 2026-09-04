'use server'

import { redirect } from 'next/navigation'
import { getStripe } from './client'
import { getOrCreateCustomerId } from './customer'
import { CURRENCIES, TRIAL_PERIOD_DAYS, type Currency, type Interval } from './pricing'
import { getUser, getProfile } from '@/lib/auth/dal'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrigin } from '@/lib/site'

/** Start a subscription checkout for a product + interval. Redirects to Stripe. */
export async function startCheckoutAction(formData: FormData) {
  const user = await getUser()
  if (!user) redirect('/login?redirectTo=/pricing')

  const productId = String(formData.get('productId') ?? '')
  const interval = (String(formData.get('interval') ?? 'year') === 'month'
    ? 'month'
    : 'year') as Interval
  const requestedCurrency = String(formData.get('currency') ?? '').toLowerCase()
  const currency = (CURRENCIES as readonly string[]).includes(requestedCurrency)
    ? requestedCurrency as Currency
    : undefined
  const addInterviews = formData.get('addInterviews') === 'on'

  const supabase = createAdminClient()
  const { data: product } = await supabase
    .from('products')
    .select('id, stripe_product_id')
    .eq('id', productId)
    .maybeSingle()
  if (!product?.stripe_product_id) redirect('/pricing?error=unknown_product')

  const stripe = getStripe()
  const prices = await stripe.prices.list({
    product: product.stripe_product_id,
    active: true,
    recurring: { interval },
    limit: 1,
  })
  const price = prices.data[0]
  if (!price) redirect('/pricing?error=no_price')

  const lineItems: { price: string; quantity: number }[] = [{ price: price.id, quantity: 1 }]
  if (addInterviews) {
    const { data: interviewExam } = await supabase.from('exams').select('id').eq('slug', 'interviews').maybeSingle()
    const { data: interviews } = interviewExam
      ? await supabase.from('products').select('stripe_product_id').eq('exam_id', interviewExam.id).maybeSingle()
      : { data: null }
    if (interviews?.stripe_product_id && interviews.stripe_product_id !== product.stripe_product_id) {
      const interviewPrices = await stripe.prices.list({
        product: interviews.stripe_product_id,
        active: true,
        recurring: { interval },
        limit: 1,
      })
      if (interviewPrices.data[0]) lineItems.push({ price: interviewPrices.data[0].id, quantity: 1 })
    }
  }

  const profile = await getProfile()
  if (!profile?.full_name || !profile.phone_number) redirect('/account?complete=trial')
  const customerId = await getOrCreateCustomerId(user.id, user.email, profile?.full_name)
  const origin = await getOrigin()

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_collection: 'if_required',
    customer: customerId,
    line_items: lineItems,
    ...(currency ? { currency } : {}),
    subscription_data: {
      trial_period_days: TRIAL_PERIOD_DAYS,
      trial_settings: {
        end_behavior: { missing_payment_method: 'pause' },
      },
      metadata: { supabase_user_id: user.id },
    },
    success_url: `${origin}/account?checkout=success`,
    cancel_url: `${origin}/pricing?checkout=cancelled`,
    allow_promotion_codes: true,
  })

  if (!session.url) redirect('/pricing?error=checkout_failed')
  redirect(session.url)
}

/** Open the Stripe billing portal for the current user. */
export async function openBillingPortalAction() {
  const user = await getUser()
  if (!user) redirect('/login?redirectTo=/account')
  const profile = await getProfile()
  if (!profile?.stripe_customer_id) redirect('/pricing')

  const stripe = getStripe()
  const origin = await getOrigin()
  const portal = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${origin}/account`,
  })
  redirect(portal.url)
}
