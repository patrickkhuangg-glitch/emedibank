/**
 * Seed Stripe with the paywall products + prices, then mirror them into the
 * `products` table. Idempotent — safe to re-run.
 *
 *   npm run seed:stripe
 *
 * Creates one product per paid exam (UCAT, GAMSAT, ISAT) plus an all-access
 * bundle, each with a monthly and yearly price. Base currency AUD with matching
 * options in GBP/HKD/NZD/SGD. Yearly amounts come from src/lib/stripe/pricing.ts;
 * monthly is derived as ~yearly/6. Needs STRIPE_SECRET_KEY,
 * NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY (loaded via --env-file).
 */
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import {
  BASE_CURRENCY,
  BILLING_INTERVALS,
  BUNDLE_NAME,
  CURRENCIES,
  PAID_EXAM_SLUGS,
  YEARLY_BUNDLE,
  YEARLY_PER_EXAM,
  monthlyFromYearly,
  type Currency,
  type Interval,
} from '../src/lib/stripe/pricing.ts'

function env(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing environment variable ${name}`)
  return v
}

const stripe = new Stripe(env('STRIPE_SECRET_KEY'), { apiVersion: '2026-08-26.dahlia' })
const supabase = createClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SECRET_KEY'))

function assertFilled(label: string, yearly: Record<Currency, number>): void {
  for (const currency of CURRENCIES) {
    if (!(yearly[currency] > 0)) {
      throw new Error(
        `${label} yearly amount for ${currency.toUpperCase()} is not set. Fill it in src/lib/stripe/pricing.ts before seeding.`,
      )
    }
  }
}

function amountFor(yearly: Record<Currency, number>, currency: Currency, interval: Interval): number {
  return interval === 'year' ? yearly[currency] : monthlyFromYearly(yearly[currency])
}

function priceParams(yearly: Record<Currency, number>, interval: Interval) {
  const currency_options: Record<string, { unit_amount: number }> = {}
  for (const currency of CURRENCIES) {
    if (currency === BASE_CURRENCY) continue
    currency_options[currency] = { unit_amount: amountFor(yearly, currency, interval) }
  }
  return {
    currency: BASE_CURRENCY,
    unit_amount: amountFor(yearly, BASE_CURRENCY, interval),
    recurring: { interval },
    currency_options,
  }
}

async function ensureProduct(opts: {
  name: string
  kind: 'exam' | 'bundle'
  examId: string | null
  metadata: Record<string, string>
}): Promise<string> {
  let query = supabase.from('products').select('stripe_product_id').eq('kind', opts.kind)
  query = opts.examId ? query.eq('exam_id', opts.examId) : query.is('exam_id', null)
  const { data: existing } = await query.maybeSingle()

  let stripeProductId = existing?.stripe_product_id ?? null
  if (stripeProductId) {
    await stripe.products.update(stripeProductId, { name: opts.name, metadata: opts.metadata })
  } else {
    const product = await stripe.products.create({ name: opts.name, metadata: opts.metadata })
    stripeProductId = product.id
  }

  await supabase
    .from('products')
    .upsert(
      { stripe_product_id: stripeProductId, name: opts.name, kind: opts.kind, exam_id: opts.examId },
      { onConflict: 'stripe_product_id' },
    )
  return stripeProductId
}

async function ensurePrice(
  stripeProductId: string,
  yearly: Record<Currency, number>,
  interval: Interval,
): Promise<string> {
  const existing = await stripe.prices.list({
    product: stripeProductId,
    active: true,
    recurring: { interval },
    limit: 1,
  })
  if (existing.data[0]) return existing.data[0].id
  const price = await stripe.prices.create({ product: stripeProductId, ...priceParams(yearly, interval) })
  return price.id
}

async function main() {
  assertFilled('Per-exam', YEARLY_PER_EXAM)
  assertFilled('Bundle', YEARLY_BUNDLE)

  const { data: exams, error } = await supabase
    .from('exams')
    .select('id, name, slug')
    .in('slug', [...PAID_EXAM_SLUGS])
  if (error) throw error

  for (const exam of exams ?? []) {
    const productId = await ensureProduct({
      name: `${exam.name} — Full access`,
      kind: 'exam',
      examId: exam.id,
      metadata: { exam_slug: exam.slug },
    })
    for (const interval of BILLING_INTERVALS) {
      const priceId = await ensurePrice(productId, YEARLY_PER_EXAM, interval)
      console.log(`  ${exam.slug} ${interval} -> ${priceId}`)
    }
    console.log(`✔ ${exam.name}  (${productId})`)
  }

  const bundleId = await ensureProduct({
    name: BUNDLE_NAME,
    kind: 'bundle',
    examId: null,
    metadata: { plan: 'all-access' },
  })
  for (const interval of BILLING_INTERVALS) {
    const priceId = await ensurePrice(bundleId, YEARLY_BUNDLE, interval)
    console.log(`  all-access ${interval} -> ${priceId}`)
  }
  console.log(`✔ ${BUNDLE_NAME}  (${bundleId})`)
  console.log('\nDone. Products mirrored into the products table.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
