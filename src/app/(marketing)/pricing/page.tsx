import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/container'
import { ButtonLink } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe/client'
import { PAID_EXAM_SLUGS } from '@/lib/stripe/pricing'
import { PricingCards, type Plan } from './pricing-cards'

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

  // Gather monthly/yearly amounts per Stripe product in one call.
  const stripe = getStripe()
  const prices = await stripe.prices.list({ active: true, limit: 100 })
  const amounts = new Map<string, { month: number | null; year: number | null }>()
  for (const price of prices.data) {
    const prodId = typeof price.product === 'string' ? price.product : price.product.id
    const interval = price.recurring?.interval
    const entry = amounts.get(prodId) ?? { month: null, year: null }
    if (interval === 'month') entry.month = price.unit_amount
    else if (interval === 'year') entry.year = price.unit_amount
    else continue
    amounts.set(prodId, entry)
  }

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
      const amt = amounts.get(p.stripe_product_id as string) ?? { month: null, year: null }
      return { productId: p.id, name: p.name, kind: p.kind, month: amt.month, year: amt.year }
    })
}

export default async function PricingPage() {
  const plans = await loadPlans()

  return (
    <Container className="py-16">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-semibold tracking-tight">Simple, exam-based pricing</h1>
        <p className="mx-auto mt-4 max-w-xl text-muted">
          Start free on every exam. Subscribe to unlock a full exam, or get everything with
          all-access. Monthly or yearly, 7-day free trial, cancel anytime.
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
        <PricingCards plans={plans} />
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
