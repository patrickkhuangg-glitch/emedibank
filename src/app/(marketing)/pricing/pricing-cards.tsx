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

const money = (minor: number | null) =>
  minor == null
    ? '—'
    : new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD',
        minimumFractionDigits: minor % 100 === 0 ? 0 : 2,
      }).format(minor / 100)

export function PricingCards({ plans }: { plans: Plan[] }) {
  const [interval, setInterval] = useState<'month' | 'year'>('year')

  return (
    <>
      <div className="mt-8 flex justify-center">
        <div className="inline-flex rounded-lg border border-border bg-surface p-1 text-sm">
          {(['month', 'year'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setInterval(p)}
              className={`rounded-md px-4 py-1.5 transition-colors ${
                interval === p ? 'bg-brand text-brand-foreground' : 'text-muted hover:text-foreground'
              }`}
            >
              {p === 'month' ? 'Monthly' : 'Yearly'}
              {p === 'year' ? <span className="ml-1 text-xs opacity-80">save</span> : null}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-8 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const amount = interval === 'year' ? plan.year : plan.month
          const perWeek = plan.year != null ? plan.year / 52 : null
          const featured = plan.kind === 'bundle'
          return (
            <div
              key={plan.productId}
              className={`flex flex-col rounded-2xl border bg-surface p-6 ${
                featured ? 'border-2 border-brand bg-brand-muted' : 'border-border'
              }`}
            >
              <h3 className="font-semibold">{plan.name.replace(' — Full access', '')}</h3>
              <p className="mt-4 text-3xl font-semibold tracking-tight">
                {money(amount)}
                <span className="text-sm font-normal text-muted">
                  /{interval === 'year' ? 'yr' : 'mo'}
                </span>
              </p>
              {interval === 'year' && perWeek != null ? (
                <p className="mt-1 text-xs text-muted">≈ {money(Math.round(perWeek))}/week</p>
              ) : (
                <p className="mt-1 text-xs text-muted">billed monthly</p>
              )}
              <form action={startCheckoutAction} className="mt-6 mt-auto pt-6">
                <input type="hidden" name="productId" value={plan.productId} />
                <input type="hidden" name="interval" value={interval} />
                <Button type="submit" variant={featured ? 'primary' : 'secondary'} className="w-full">
                  Start 7-day free trial
                </Button>
              </form>
            </div>
          )
        })}
      </div>
    </>
  )
}
