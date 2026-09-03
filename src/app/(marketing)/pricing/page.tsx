import type { Metadata } from 'next'
import Link from 'next/link'
import { unstable_cache } from 'next/cache'
import { headers } from 'next/headers'
import { Container } from '@/components/container'
import { ButtonLink } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe/client'
import { CURRENCIES, PAID_EXAM_SLUGS, type Currency } from '@/lib/stripe/pricing'
import { PricingCards, type Plan } from './pricing-cards'

type IntervalAmounts = { month: number | null; year: number | null }
type Amounts = Record<string, Record<Currency, IntervalAmounts>>

const COUNTRY_CURRENCY: Record<string, Currency> = {
  AU: 'aud', NZ: 'nzd', GB: 'gbp', HK: 'hkd', SG: 'sgd',
}

const emptyCurrencyAmounts = (): Record<Currency, IntervalAmounts> =>
  Object.fromEntries(CURRENCIES.map((currency) => [currency, { month: null, year: null }])) as Record<Currency, IntervalAmounts>

// Stripe price amounts change rarely; cache across requests so the pricing page
// doesn't make a live Stripe API call (the slowest thing on it) on every load.
const cachedAmounts = unstable_cache(
  async (): Promise<Amounts> => {
    const stripe = getStripe()
    const prices = await stripe.prices.list({ active: true, limit: 100, expand: ['data.currency_options'] })
    const amounts: Amounts = {}
    for (const price of prices.data) {
      const prodId = typeof price.product === 'string' ? price.product : price.product.id
      const interval = price.recurring?.interval
      const entry = amounts[prodId] ?? emptyCurrencyAmounts()
      const billingInterval = interval === 'month' ? 'month' : interval === 'year' ? 'year' : null
      if (!billingInterval) continue
      for (const currency of CURRENCIES) {
        const localized = currency === price.currency
          ? price.unit_amount
          : price.currency_options?.[currency]?.unit_amount ?? null
        entry[currency][billingInterval] = localized
      }
      amounts[prodId] = entry
    }
    return amounts
  },
  ['stripe-price-amounts'],
  { revalidate: 600, tags: ['stripe-prices'] },
)

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Free tier plus per-exam and all-access subscriptions.',
}

async function loadPlans(): Promise<Plan[]> {
  try {
    return await loadPlansUnsafe()
  } catch {
    // Stripe not configured yet, or a transient error — show the fallback, never 500.
    return []
  }
}

async function loadPlansUnsafe(): Promise<Plan[]> {
  const supabase = await createClient()
  const [{ data: products }, { data: exams }] = await Promise.all([
    supabase.from('products').select('*'),
    supabase.from('exams').select('id, slug'),
  ])
  if (!products || products.length === 0) return []

  const examSlugById = new Map((exams ?? []).map((e) => [e.id, e.slug]))

  // Monthly/yearly amounts per Stripe product (cached — see cachedAmounts).
  const amounts = await cachedAmounts()

  const order = (p: (typeof products)[number]) => {
    if (p.kind === 'bundle') return 99
    const slug = p.exam_id ? examSlugById.get(p.exam_id) : undefined
    const idx = slug ? (PAID_EXAM_SLUGS as readonly string[]).indexOf(slug) : -1
    return idx === -1 ? 50 : idx
  }

  return products
    .filter((p) => p.stripe_product_id)
    .sort((a, b) => order(a) - order(b))
    .map((p) => {
      const amt = amounts[p.stripe_product_id as string] ?? emptyCurrencyAmounts()
      const slug = p.exam_id ? examSlugById.get(p.exam_id) ?? null : null
      return { productId: p.id, name: p.name, kind: p.kind, slug, amounts: amt }
    })
}

export default async function PricingPage() {
  const plans = await loadPlans()
  const requestHeaders = await headers()
  const country = requestHeaders.get('x-vercel-ip-country')?.toUpperCase() ?? 'AU'
  const defaultCurrency = COUNTRY_CURRENCY[country] ?? 'aud'

  return (
    <Container className="py-16">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-semibold tracking-tight">Everything, priced by the week</h1>
        <p className="mx-auto mt-4 max-w-xl text-muted">
          Start free with full mock exams. Choose one exam or combine any plan with Interviews.
          Local pricing is shown in your currency, with a 7-day trial on every plan.
        </p>
      </div>

      <div className="mx-auto mt-10 max-w-md rounded-2xl border border-border bg-surface p-6 text-center">
        <h2 className="text-lg font-semibold">Free</h2>
        <p className="mt-1 text-sm text-muted">
          Sit full, timed mock exams for free. No card required.
        </p>
        <ButtonLink href="/signup" className="mt-4 w-full">Start free</ButtonLink>
      </div>

      {plans.length > 0 ? (
        <PricingCards plans={plans} defaultCurrency={defaultCurrency} />
      ) : (
        <p className="mt-8 text-center text-sm text-muted">Paid plans are being finalised.</p>
      )}

      <p className="mt-10 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-foreground hover:underline">Log in</Link>
      </p>
    </Container>
  )
}
