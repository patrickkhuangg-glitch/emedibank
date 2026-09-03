'use client'
import { useState } from 'react'
import { startCheckoutAction } from '@/lib/stripe/actions'
import { Button } from '@/components/ui/button'
import { CURRENCIES, type Currency } from '@/lib/stripe/pricing'

export type Plan = {
  productId: string
  name: string
  kind: 'exam' | 'bundle'
  slug: string | null
  amounts: Record<Currency, { month: number | null; year: number | null }>
}

const LOCALES: Record<Currency, string> = { aud: 'en-AU', nzd: 'en-NZ', gbp: 'en-GB', hkd: 'en-HK', sgd: 'en-SG' }
const LABELS: Record<Currency, string> = { aud: 'AUD', nzd: 'NZD', gbp: 'GBP', hkd: 'HKD', sgd: 'SGD' }

const fmt = (minor: number, fractionDigits: number, currency: Currency) =>
  new Intl.NumberFormat(LOCALES[currency], {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(minor / 100)

/** Everything is advertised as a weekly figure: the annual price feels smaller
 *  spread across the year, and it is the honest cost of a week of prep. */
const perWeek = (plan: Plan, interval: 'month' | 'year', currency: Currency): number | null => {
  const amount = plan.amounts[currency]
  if (interval === 'year') return amount.year != null ? amount.year / 52 : null
  return amount.month != null ? (amount.month * 12) / 52 : null
}

const featuresFor = (plan: Plan, interval: 'month' | 'year'): string[] => {
  if (plan.slug === 'interviews') return [
    'MMI and panel interview stations',
    'Structured response frameworks',
    'Ethical and personal scenarios',
    interval === 'year' ? '50 marked MMI stations included' : 'Marked MMI stations available separately',
    'Purchase additional marked stations anytime',
  ]
  const annualInterviews = interval === 'year'
    ? ['Interviews included free · limited promotion', '50 marked MMI stations included']
    : []

  if (plan.slug === 'ucat') return [
    'Authentic UCAT exam interface',
    'Timed section drills and full mocks',
    'Decision Making and SJT question formats',
    'Speed and accuracy analytics',
    ...annualInterviews,
  ]
  if (plan.slug === 'gamsat') return [
    'Section I and III stimulus practice',
    'Section II essay simulator',
    'Tutor-reviewed writing feedback',
    ...(interval === 'year' ? ['20 marked essays included'] : []),
    ...annualInterviews,
  ]
  if (plan.slug === 'isat') return [
    'Critical and quantitative reasoning',
    'Passage-based practice units',
    'Timed integrated sessions',
    'Progress by question type',
    ...annualInterviews,
  ]
  return [
    'UCAT, GAMSAT and ISAT included',
    'Every question bank and full mock',
    'Cross-exam performance analytics',
    ...(interval === 'year' ? ['20 marked essays included'] : []),
    ...annualInterviews,
    'The lowest cost per exam',
  ]
}

export function PricingCards({ plans, defaultCurrency }: { plans: Plan[]; defaultCurrency: Currency }) {
  const [interval, setInterval] = useState<'month' | 'year'>('year')
  const [currency, setCurrency] = useState<Currency>(defaultCurrency)
  const interviewPlan = plans.find((plan) => plan.slug === 'interviews')

  return (
    <>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
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
        <label className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-muted">
          <span>Currency</span>
          <select value={currency} onChange={(event) => setCurrency(event.target.value as Currency)} className="bg-transparent font-semibold text-foreground outline-none">
            {CURRENCIES.map((value) => <option key={value} value={value}>{LABELS[value]}</option>)}
          </select>
        </label>
      </div>

      <p className="mt-3 text-center text-xs text-muted">Automatically selected for your location. You can change it before checkout.</p>

      {interval === 'year' ? (
        <div className="mx-auto mt-5 flex w-fit items-center gap-2 rounded-full border border-brand/25 bg-brand-muted px-4 py-2 text-sm font-semibold text-brand">
          <span aria-hidden>✦</span> Limited promotion: Interviews included free with every annual academic plan
        </div>
      ) : null}

      <div className="mx-auto mt-8 grid max-w-[1400px] items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {plans.map((plan) => {
          const featured = plan.kind === 'bundle'
          const localized = plan.amounts[currency]
          const week = perWeek(plan, interval, currency)
          const total = interval === 'year' ? localized.year : localized.month
          const save =
            localized.month != null && localized.year != null && localized.month > 0
              ? Math.round((1 - localized.year / (localized.month * 12)) * 100)
              : null
          const canAddInterviews = interval === 'month' && plan.slug !== 'interviews' && !!interviewPlan
          const interviewWeek = interviewPlan ? perWeek(interviewPlan, interval, currency) : null

          return (
            <div
              key={plan.productId}
              className={`relative flex flex-col rounded-2xl border p-5 ${
                featured ? 'border-2 border-brand bg-brand-muted shadow-md' : 'border-border bg-surface'
              }`}
            >
              {featured ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-ink px-3 py-1 text-[11px] font-semibold text-ink-foreground">
                  Most popular
                </span>
              ) : null}

              <h3 className="font-display text-base font-semibold">{plan.name.replace(' — Full access', '')}</h3>
              {interval === 'year' && plan.slug !== 'interviews' ? (
                <span className="mt-2 w-fit rounded-full bg-brand px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-brand-foreground">Free Interviews promo</span>
              ) : null}

              <div className="mt-4">
                <span className="font-display text-3xl font-semibold tracking-tight tabular-nums xl:text-4xl">
                  {week != null ? fmt(week, 2, currency) : '—'}
                </span>
                <span className="text-sm font-medium text-muted"> /week</span>
              </div>

              <p className="mt-1.5 text-xs text-muted">
                {total != null
                  ? interval === 'year'
                    ? `Billed annually at ${fmt(total, total % 100 === 0 ? 0 : 2, currency)}`
                    : `Billed monthly at ${fmt(total, total % 100 === 0 ? 0 : 2, currency)}`
                  : 'Price coming soon'}
              </p>
              {interval === 'year' && save != null && save > 0 ? (
                <p className="mt-1 inline-flex w-fit rounded-full bg-success-muted px-2 py-0.5 text-[11px] font-medium text-success">
                  Save {save}% vs monthly
                </p>
              ) : null}

              <ul className="mt-5 space-y-2.5 border-t border-border/70 pt-5 text-sm">
                {featuresFor(plan, interval).map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check /> <span className="text-foreground/90">{f}</span>
                  </li>
                ))}
              </ul>

              <form action={startCheckoutAction} className="mt-6 pt-2">
                <input type="hidden" name="productId" value={plan.productId} />
                <input type="hidden" name="interval" value={interval} />
                <input type="hidden" name="currency" value={currency} />
                {canAddInterviews ? (
                  <label className="mb-4 flex cursor-pointer items-start gap-2.5 rounded-xl border border-brand/25 bg-brand-muted/55 p-3 text-sm transition-colors hover:border-brand/50">
                    <input type="checkbox" name="addInterviews" className="mt-0.5 accent-[var(--brand)]" />
                    <span><b className="font-semibold">Add Interviews</b><span className="mt-0.5 block text-xs text-muted">{interviewWeek != null ? `+${fmt(interviewWeek, 2, currency)}/week` : 'Local price at checkout'}</span></span>
                  </label>
                ) : null}
                <Button type="submit" variant={featured ? 'primary' : 'secondary'} className="w-full">
                  Start 7-day free trial
                </Button>
                <p className="mt-2 text-center text-[11px] text-muted">Then {week != null ? fmt(week, 2, currency) : ''}/week. Cancel anytime.</p>
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
