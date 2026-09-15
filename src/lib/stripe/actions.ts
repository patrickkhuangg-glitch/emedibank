'use server'

import { redirect } from 'next/navigation'
import { paymentsAvailable } from '@/lib/security/payments'
import { getStripe } from './client'
import { getOrCreateCustomerId } from './customer'
import { CURRENCIES, type Currency, type Interval } from './pricing'
import { getCheckoutTrialEnd } from './trial'
import { getUser, getProfile } from '@/lib/auth/dal'
import { createClient } from '@/lib/supabase/server'
import { getOrigin } from '@/lib/site'

/** Start a subscription checkout for a product + interval. Redirects to Stripe. */
export async function startCheckoutAction(formData: FormData) {
  if (!paymentsAvailable()) redirect('/pricing?error=payments_unavailable')
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
  const subscribeNow = formData.get('checkoutMode') === 'paid'
  const addInterviews = formData.get('addInterviews') === 'on'

  // Products and exams are a public catalogue. Read them through the normal
  // request-scoped client so checkout does not need privileged database access
  // until it actually creates or updates the customer's private billing data.
  const supabase = await createClient()
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, stripe_product_id')
    .eq('id', productId)
    .maybeSingle()
  if (productError || !product?.stripe_product_id) redirect('/pricing?error=unknown_product')

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
  // An existing subscription for the same product belongs in billing management,
  // not a second checkout (including subscriptions whose webhooks are delayed).
  const existing = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 100 })
  const selectedPrices = new Set(lineItems.map(item => item.price))
  const selectedProducts = new Set([product.stripe_product_id])
  if (addInterviews) {
    for (const item of lineItems.slice(1)) {
      const extraPrice = await stripe.prices.retrieve(item.price)
      selectedProducts.add(typeof extraPrice.product === 'string' ? extraPrice.product : extraPrice.product.id)
    }
  }
  if (existing.has_more || existing.data.some(subscription =>
    !['canceled', 'incomplete_expired'].includes(subscription.status) &&
    subscription.items.data.some(item => selectedPrices.has(item.price.id) || selectedProducts.has(
      typeof item.price.product === 'string' ? item.price.product : item.price.product.id,
    ))
  )) redirect('/pricing?error=existing_subscription')

  const trialEnd = subscribeNow ? null : await getCheckoutTrialEnd(user.id, customerId)
  const origin = await getOrigin()

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    consent_collection: { terms_of_service: 'required' },
    automatic_tax: { enabled: false },
    payment_method_collection: 'if_required',
    customer: customerId,
    line_items: lineItems,
    ...(currency ? { currency } : {}),
    subscription_data: {
      ...(trialEnd ? { trial_end: trialEnd, trial_settings: {
        end_behavior: { missing_payment_method: 'pause' },
      } } : {}),
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
