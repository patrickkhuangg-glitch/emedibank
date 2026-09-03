// Pricing for the Stripe seeding script.
//
// Model (confirmed): a separate subscription per exam (UCAT, GAMSAT, ISAT), each
// unlocking ALL of that exam's resources, PLUS an all-access bundle across every
// exam. Interviews is available standalone and as an optional add-on to every
// other plan. Base currency AUD, with equivalent
// round prices (ending in 99) in GBP/HKD/NZD/SGD via Stripe currency options.
// 7-day trial applied at checkout.
//
// Only YEARLY amounts are configured; the monthly price is derived automatically
// as ~yearly / 6, rounded to a .99 ending (A$399/yr -> A$66.99/mo). Amounts are
// in each currency's smallest unit (cents): A$399.00 => 39900. Fill every value
// before `npm run seed:stripe` — the script refuses zeros.

export const BASE_CURRENCY = 'aud'
export const TRIAL_PERIOD_DAYS = 7

export const BILLING_INTERVALS = ['month', 'year'] as const
export type Interval = (typeof BILLING_INTERVALS)[number]

export const CURRENCIES = ['aud', 'gbp', 'hkd', 'nzd', 'sgd'] as const
export type Currency = (typeof CURRENCIES)[number]

export const PAID_EXAM_SLUGS = ['ucat', 'gamsat', 'isat', 'interviews'] as const
export const BUNDLE_NAME = 'All-access'

// Yearly amounts per currency (smallest unit). A$399/yr per exam is confirmed.
export const YEARLY_PER_EXAM: Record<Currency, number> = {
  aud: 39900, // A$399
  gbp: 19900, // £199
  hkd: 199900, // HK$1,999
  nzd: 39900, // NZ$399
  sgd: 39900, // S$399
}

// Interviews is intentionally half the standard exam price.
export const YEARLY_INTERVIEWS: Record<Currency, number> = {
  aud: 19900,
  gbp: 9900,
  hkd: 99900,
  nzd: 19900,
  sgd: 19900,
}

export const YEARLY_BUNDLE: Record<Currency, number> = {
  aud: 79900, // A$799
  gbp: 39900, // £399
  hkd: 409900, // HK$4,099
  nzd: 89900, // NZ$899
  sgd: 69900, // S$699
}

/** Monthly derived from yearly: ~yearly / 6, rounded to the nearest .99 ending. */
export function monthlyFromYearly(yearlyMinorUnits: number): number {
  const base = yearlyMinorUnits / 6
  const k = Math.max(0, Math.round((base - 99) / 100))
  return k * 100 + 99
}
