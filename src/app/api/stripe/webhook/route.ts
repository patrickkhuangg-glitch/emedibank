import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe/client'
import { getStripeWebhookSecret } from '@/lib/stripe/env'
import { upsertSubscriptionFromStripe } from '@/lib/stripe/sync-subscription'

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
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Invalid signature'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
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
        await upsertSubscriptionFromStripe(event.data.object as Stripe.Subscription)
        break
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subRef = (invoice as unknown as {
          subscription?: string | { id: string }
        }).subscription
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
  } catch (err) {
    // Return 500 so Stripe retries — handlers must be safe to run again.
    const msg = err instanceof Error ? err.message : 'Handler error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
