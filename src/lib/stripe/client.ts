import 'server-only'
import Stripe from 'stripe'
import { getStripeSecretKey } from './env'

let client: Stripe | null = null

export function getStripe(): Stripe {
  if (!client) {
    client = new Stripe(getStripeSecretKey(), { apiVersion: '2026-08-26.dahlia' })
  }
  return client
}
