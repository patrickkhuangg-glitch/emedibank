'use client'
import { useState } from 'react'
import { startCheckoutAction } from '@/lib/stripe/actions'
import { Button } from '@/components/ui/button'

export type Plan = {
  productId: string
  name: string
  kind: 'exam' | 'bundle'
  month: number | null
  year: number | null
}

const fmt = (minor: number, fractionDigits: number) =>
  new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(minor / 100)

/** Everything is advertised as a weekly figure: the annual price feels smaller
 *  spread across the year, and it is the honest cost of a week of prep. */
const perWeek = (plan: Plan, interval: 'month' | 'year'): number | null => {
  if (interval === 'year') return plan.year != null ? plan.year / 52 : null
  return plan.month != null ? (plan.month * 12) / 52 : null
}

const FEATURES: Record<Plan['kind'], string[]> = {
  exam: [
    'The complete question bank',
    'Every question type, exam-accurate',
    'Written and video explanations',
    'Unlimited full, timed mock exams',
    'Per-section performance analytics',
  ],
  bundle: [
    'UCAT, GAMSAT and ISAT, all included',
    'Every question bank and all mocks',
    'Written and video explanations',
    'Per-section performance analytics',
    'The lowest cost per exam',
  ],
}

export function PricingCards({ plans }: { plans: Plan[] }) {
  const [interval, setInterval] = useState<'month' | 'year'>('year')

  return (
    <>
      <div className="mt-8 flex justify-center">
        <div className="inline-flex rounded-full border border-border bg-surface p-1 text-sm">
          {(['month', 'year'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setInterval(p)}
              className={`rounded-full px-4 py-1.5 font-medium transition-colors ${
                interval === p ? 'bg-ink text-ink-foreground shadow-sm' : 'text-muted hover:text-foreground'
              }`}
            >
              {p === 'month' ? 'Monthly' : 'Yearly'}
              {p === 'year' ? <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${interval === 'year' ? 'bg-brand text-brand-foreground' : 'bg-brand-muted text-brand'}`}>Best value</span> : null}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-8 grid max-w-5xl items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const featured = plan.kind === 'bundle'
          const week = perWeek(plan, interval)
          const total = interval === 'year' ? plan.year : plan.month
          const save =
            plan.month != null && plan.year != null && plan.month > 0
              ? Math.round((1 - plan.year / (plan.month * 12)) * 100)
              : null

          return (
            <div
              key={plan.productId}
              className={`relative flex flex-col rounded-2xl border p-6 ${
                featured ? 'border-2 border-brand bg-brand-muted shadow-md' : 'border-border bg-surface'
              }`}
            >
              {featured ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-ink px-3 py-1 text-[11px] font-semibold text-ink-foreground">
                  Most popular
                </span>
              ) : null}

              <h3 className="font-display text-base font-semibold">{plan.name.replace(' — Full access', '')}</h3>

              <div className="mt-4">
                <span className="font-display text-4xl font-semibold tracking-tight tabular-nums">
                  {week != null ? fmt(week, 2) : '—'}
                </span>
                <span className="text-sm font-medium text-muted"> /week</span>
              </div>

              <p className="mt-1.5 text-xs text-muted">
                {total != null
                  ? interval === 'year'
                    ? `Billed annually at ${fmt(total, total % 100 === 0 ? 0 : 2)}`
                    : `Billed monthly at ${fmt(total, total % 100 === 0 ? 0 : 2)}`
                  : 'Price coming soon'}
              </p>
              {interval === 'year' && save != null && save > 0 ? (
                <p className="mt-1 inline-flex w-fit rounded-full bg-success-muted px-2 py-0.5 text-[11px] font-medium text-success">
                  Save {save}% vs monthly
                </p>
              ) : null}

              <ul className="mt-5 space-y-2.5 border-t border-border/70 pt-5 text-sm">
                {FEATURES[plan.kind].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check /> <span className="text-foreground/90">{f}</span>
                  </li>
                ))}
              </ul>

              <form action={startCheckoutAction} className="mt-6 pt-2">
                <input type="hidden" name="productId" value={plan.productId} />
                <input type="hidden" name="interval" value={interval} />
                <Button type="submit" variant={featured ? 'primary' : 'secondary'} className="w-full">
                  Start 7-day free trial
                </Button>
                <p className="mt-2 text-center text-[11px] text-muted">Then {week != null ? fmt(week, 2) : ''}/week. Cancel anytime.</p>
              </form>
            </div>
          )
        })}
      </div>
    </>
  )
}

function Check() {
  return (
    <span className="mt-0.5 grid h-4 w-4 flex-none place-items-center rounded-full bg-brand-muted text-brand">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m5 12 5 5L20 7" /></svg>
    </span>
  )
}
