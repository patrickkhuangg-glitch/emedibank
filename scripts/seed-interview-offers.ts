/** Create or validate the one-off Interview plans and credit packs in Stripe. */
import Stripe from 'stripe'
import { INTERVIEW_MARKETING } from '../src/lib/interviews/marketing.ts'

const key = process.env.STRIPE_SECRET_KEY
if (!key) throw new Error('Missing STRIPE_SECRET_KEY')
const stripe = new Stripe(key, { apiVersion: '2026-08-26.dahlia' })
const offers = [...INTERVIEW_MARKETING.plans, ...INTERVIEW_MARKETING.extras]

for (const offer of offers) {
  const products = await stripe.products.list({ active: true, limit: 100 })
  let product = products.data.find((item) => item.metadata.studocyte_interview_offer === offer.id)
  const metadata = {
    studocyte_interview_offer: offer.id,
    offer_kind: offer.kind,
    credits: String(offer.credits),
    access_days: String(offer.accessDays),
  }
  if (product) {
    product = await stripe.products.update(product.id, { name: offer.name, metadata })
  } else {
    product = await stripe.products.create({ name: offer.name, metadata })
  }

  const prices = await stripe.prices.list({ active: true, lookup_keys: [offer.lookupKey], limit: 2 })
  const existing = prices.data[0]
  if (existing) {
    const productId = typeof existing.product === 'string' ? existing.product : existing.product.id
    if (prices.data.length !== 1 || productId !== product.id || existing.currency !== 'aud'
      || existing.unit_amount !== offer.price * 100 || existing.recurring) {
      throw new Error(`Existing Stripe price does not match ${offer.id}`)
    }
    console.log(`${offer.id}: ${product.id} / ${existing.id}`)
    continue
  }

  const price = await stripe.prices.create({
    product: product.id,
    currency: 'aud',
    unit_amount: offer.price * 100,
    lookup_key: offer.lookupKey,
  })
  console.log(`${offer.id}: ${product.id} / ${price.id}`)
}
