import type { Metadata } from 'next'
import Link from 'next/link'
import { unstable_cache } from 'next/cache'
import { headers } from 'next/headers'
import { PageContainer as Container } from '@/components/container'
import { ButtonLink } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe/client'
import { CURRENCIES, PAID_EXAM_SLUGS, type Currency } from '@/lib/stripe/pricing'
import { PricingCards, type Plan } from './pricing-cards'
import { paymentsAvailable } from '@/lib/security/payments'

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
  alternates: { canonical: '/pricing' },
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
    .filter((p) => p.stripe_product_id && (!p.exam_id || examSlugById.get(p.exam_id) !== 'interviews'))
    .sort((a, b) => order(a) - order(b))
    .map((p) => {
      const amt = amounts[p.stripe_product_id as string] ?? emptyCurrencyAmounts()
      const slug = p.exam_id ? examSlugById.get(p.exam_id) ?? null : null
      return { productId: p.id, name: p.name, kind: p.kind, slug, amounts: amt }
    })
}

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ signup?: string; checkout?: string; error?: string }> }) {
  const plans = await loadPlans()
  const { signup, checkout, error } = await searchParams
  const requestHeaders = await headers()
  const country = requestHeaders.get('x-vercel-ip-country')?.toUpperCase() ?? 'AU'
  const defaultCurrency = COUNTRY_CURRENCY[country] ?? 'aud'

  return (
    <Container>
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="page-title">Everything, priced by the week</h1>
        <p className="mx-auto mt-4 max-w-xl text-muted">
          Start free with full mock exams. Annual academic plans include Interview practice access;
          tutor-review credits are available through the dedicated Interview packages. Local pricing is shown in your currency.
        </p>
        {signup === 'success' ? <p role="status" className="mx-auto mt-5 max-w-xl rounded-2xl bg-mint-muted px-4 py-3 text-sm font-medium text-mint-deep">Your email is verified. Try Interviews free, choose an academic trial, or subscribe for immediate full access.</p> : null}
        {checkout === 'cancelled' ? <p role="status" className="mx-auto mt-5 max-w-xl rounded-2xl bg-surface-muted px-4 py-3 text-sm text-muted">Checkout was cancelled. Your account is ready whenever you are.</p> : null}
      </div>

      {error === 'existing_subscription' && <p role="status" className="mx-auto mt-5 max-w-xl rounded-2xl bg-surface-muted p-4 text-sm">You already have a subscription for this plan. <Link href="/account" className="font-semibold text-brand underline">Manage your subscription in your account</Link> to avoid paying twice.</p>}
      <div className="mx-auto mt-10 max-w-md rounded-2xl border border-border bg-surface p-6 text-center">
        <h2 className="text-lg font-semibold">Free</h2>
        <p className="mt-1 text-sm text-muted">
          Sit full, timed mock exams for free. No card required.
        </p>
        <ButtonLink href="/signup" className="mt-4 w-full">Start free</ButtonLink>
      </div>

      <section className="mx-auto mt-6 max-w-md rounded-2xl border border-brand/20 bg-brand-muted/30 p-6 text-center" aria-labelledby="interview-trial-heading">
        <h2 id="interview-trial-heading" className="text-lg font-semibold">Try Interviews free for seven days</h2>
        <p className="mt-2 text-sm leading-6 text-muted">15 MMI stations, one question from each panel theme, two trial mocks, 60 minutes of transcription and 2 marking credits. No card required.</p>
        <ButtonLink href="/interview-preparation" className="mt-4 w-full">Try Interviews free</ButtonLink>
        <Link href="/interview-trial" className="mt-3 block text-xs text-brand underline">View trial allowances and privacy</Link>
        <p className="mt-3 text-xs text-muted">Ready for the full question bank? Subscribe below without taking a trial.</p>
      </section>

      {!paymentsAvailable() ? <p role="status" className="mt-8 text-center text-sm text-muted">Paid subscriptions are not available yet. You can continue using the free resources.</p> : plans.length > 0 ? (
        <PricingCards plans={plans} defaultCurrency={defaultCurrency} />
      ) : (
        <p className="mt-8 text-center text-sm text-muted">Paid plans are being finalised.</p>
      )}

      <p className="mx-auto mt-6 max-w-xl text-center text-sm text-muted">
        The interview trial starts with your first practice. Academic subscription trials start when you first open checkout; returning keeps the original end date. Choose “Subscribe now” to skip the trial and start billing immediately.
      </p>
      <p className="mx-auto mt-4 max-w-xl text-center text-xs text-muted">No GST charged. Cancel future renewals at any time. <a className="underline" href="https://emeducate.com.au/studocyte/terms">Subscription terms</a> · <a className="underline" href="https://emeducate.com.au/refunds">Refunds and cancellations</a> · <a className="underline" href="mailto:support@emeducate.com.au">Support</a></p>

      <p className="mt-10 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-foreground hover:underline">Log in</Link>
      </p>
    </Container>
  )
}
