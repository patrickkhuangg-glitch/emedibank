import 'server-only'

export function paymentsAvailable(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.PAYMENTS_ENABLED !== 'true') return false
  const production = env.APP_ENV === 'production'
  if (!['development','staging','production'].includes(env.APP_ENV ?? '')) return false
  if (production && env.P0_RELEASE_APPROVED !== 'true') return false
  const mode = production ? 'live' : 'test'
  if (!new RegExp(`^(sk|rk)_${mode}_`).test(env.STRIPE_SECRET_KEY ?? '')
    || !env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith(`pk_${mode}_`)) return false
  if (env.VERCEL_ENV === 'production' && !production) return false
  if (env.VERCEL_ENV === 'preview' && production) return false
  const actual = env.NEXT_PUBLIC_SUPABASE_URL
  const expected = env.SUPABASE_EXPECTED_URL
  const prod = env.PRODUCTION_SUPABASE_URL
  if (!actual || !expected || !prod || actual !== expected) return false
  if (production ? actual !== prod : actual === prod) return false
  return true
}
