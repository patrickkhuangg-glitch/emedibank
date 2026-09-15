import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe/client'
import { getStripeWebhookSecret } from '@/lib/stripe/env'
import { upsertSubscriptionFromStripe } from '@/lib/stripe/sync-subscription'
import { fulfilInterviewPurchase } from '@/lib/stripe/interview-purchase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  const stripe = getStripe()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, getStripeWebhookSecret())
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }
  if (!['production','staging','development'].includes(process.env.APP_ENV ?? '')
    || event.livemode !== (process.env.APP_ENV === 'production')) {
    return NextResponse.json({ error: 'Webhook environment mismatch' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode === 'payment') {
          await fulfilInterviewPurchase(session)
          break
        }
        const subId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId)
          await upsertSubscriptionFromStripe(sub)
        }
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        // Fetch current state so a delayed/replayed event cannot restore canceled access.
        const current = await stripe.subscriptions.retrieve((event.data.object as Stripe.Subscription).id)
        await upsertSubscriptionFromStripe(current)
        break
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subRef = invoice.parent?.subscription_details?.subscription
        const subId = typeof subRef === 'string' ? subRef : subRef?.id
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId)
          await upsertSubscriptionFromStripe(sub)
        }
        break
      }
      default:
        break
    }
  } catch {
    // Return 500 so Stripe retries — handlers must be safe to run again.
    return NextResponse.json({ error: 'Unable to synchronize billing. Please retry.' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
