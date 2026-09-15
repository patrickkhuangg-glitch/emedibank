export type AppEnvironment = 'development' | 'staging' | 'production'

const APP_ENVIRONMENTS = new Set<AppEnvironment>([
  'development',
  'staging',
  'production',
])

export function getAppEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): AppEnvironment | null {
  const value = env.APP_ENV
  return APP_ENVIRONMENTS.has(value as AppEnvironment)
    ? (value as AppEnvironment)
    : null
}

export function isPublicProduction(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return getAppEnvironment(env) === 'production'
    && env.VERCEL_ENV !== 'preview'
    && (!env.VERCEL_TARGET_ENV || env.VERCEL_TARGET_ENV === 'production')
}

export function stagingIsolationErrors(
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  if (getAppEnvironment(env) !== 'staging') return []

  const errors: string[] = []
  const actualDatabase = env.NEXT_PUBLIC_SUPABASE_URL
  const expectedDatabase = env.SUPABASE_EXPECTED_URL
  const productionDatabase = env.PRODUCTION_SUPABASE_URL
  const siteUrl = env.NEXT_PUBLIC_SITE_URL

  if (!actualDatabase || actualDatabase !== expectedDatabase) {
    errors.push('database-mismatch')
  }
  if (!productionDatabase || actualDatabase === productionDatabase) {
    errors.push('production-database')
  }
  if (!siteUrl || siteUrl === 'https://studocyte.emeducate.com.au') {
    errors.push('production-site-url')
  }
  if (env.PAYMENTS_ENABLED === 'true') {
    if (!env.STRIPE_SECRET_KEY?.startsWith('sk_test_')
      && !env.STRIPE_SECRET_KEY?.startsWith('rk_test_')) {
      errors.push('non-test-stripe-secret')
    }
    if (!env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_test_')) {
      errors.push('non-test-stripe-publishable-key')
    }
  }

  return errors
}
