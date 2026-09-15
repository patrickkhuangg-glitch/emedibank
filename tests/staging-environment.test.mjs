import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadModule } from './helpers/load-module.mjs'

const deployment = loadModule('src/lib/deployment-environment.ts')

test('only the true production target is indexable', () => {
  assert.equal(deployment.isPublicProduction({ APP_ENV: 'production', VERCEL_TARGET_ENV: 'production' }), true)
  assert.equal(deployment.isPublicProduction({ APP_ENV: 'production', VERCEL_ENV: 'preview' }), false)
  assert.equal(deployment.isPublicProduction({ APP_ENV: 'staging', VERCEL_TARGET_ENV: 'staging' }), false)
  assert.equal(deployment.isPublicProduction({}), false)
})

test('staging rejects production origins, databases and payment keys', () => {
  const safe = {
    APP_ENV: 'staging',
    NEXT_PUBLIC_SITE_URL: 'https://staging.studocyte.emeducate.com.au',
    NEXT_PUBLIC_SUPABASE_URL: 'https://stage.supabase.co',
    SUPABASE_EXPECTED_URL: 'https://stage.supabase.co',
    PRODUCTION_SUPABASE_URL: 'https://prod.supabase.co',
    PAYMENTS_ENABLED: 'false',
  }
  assert.equal(deployment.stagingIsolationErrors(safe).length, 0)
  assert(deployment.stagingIsolationErrors({ ...safe, NEXT_PUBLIC_SUPABASE_URL: safe.PRODUCTION_SUPABASE_URL }).includes('production-database'))
  assert(deployment.stagingIsolationErrors({ ...safe, NEXT_PUBLIC_SITE_URL: 'https://studocyte.emeducate.com.au' }).includes('production-site-url'))
  assert(deployment.stagingIsolationErrors({ ...safe, PAYMENTS_ENABLED: 'true', STRIPE_SECRET_KEY: 'sk_live_bad', NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_live_bad' }).includes('non-test-stripe-secret'))
})

test('staging robots block every crawler and omit the sitemap', () => {
  const robotsModule = loadModule('src/app/robots.ts', {
    '@/lib/site': { SITE_URL: 'https://staging.studocyte.emeducate.com.au' },
    '@/lib/deployment-environment': { isPublicProduction: () => false },
  })
  const result = robotsModule.default()
  assert.equal(result.rules.disallow, '/')
  assert.equal(result.sitemap, undefined)
})

test('health fails closed when a staging-labelled build contains production public values', async () => {
  let databaseCalls = 0
  const env = {
    APP_ENV: 'staging',
    NEXT_PUBLIC_SITE_URL: 'https://staging.studocyte.emeducate.com.au',
    NEXT_PUBLIC_SUPABASE_URL: 'https://prod.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-fixture',
    SUPABASE_EXPECTED_URL: 'https://stage.supabase.co',
    PRODUCTION_SUPABASE_URL: 'https://prod.supabase.co',
  }
  const healthModule = loadModule('src/app/api/health/route.ts', {
    '@supabase/supabase-js': { createClient: () => { databaseCalls++; throw Error('must not connect') } },
    'next/server': { NextResponse: { json: (body, init) => new Response(JSON.stringify(body), init) } },
    '@/lib/deployment-environment': deployment,
  }, { process: { env } })

  const response = await healthModule.GET()
  const body = await response.json()
  assert.equal(response.status, 503)
  assert.equal(body.checks.isolation, 'failed')
  assert.equal(body.checks.database, 'unavailable')
  assert.equal(databaseCalls, 0)
})
