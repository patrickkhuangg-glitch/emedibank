import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import {
  getAppEnvironment,
  stagingIsolationErrors,
} from '@/lib/deployment-environment'
import type { Database } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  const environment = getAppEnvironment()
  // NEXT_PUBLIC values are frozen into a Next.js build. Pass the compiled
  // values into the runtime isolation check so an artifact built for production
  // cannot be relabelled as staging and report a false green result.
  const databaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const databaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  const isolationErrors = stagingIsolationErrors({
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: databaseUrl,
    NEXT_PUBLIC_SITE_URL: siteUrl,
  })
  let database: 'ok' | 'unavailable' = 'unavailable'

  try {
    if (databaseUrl && databaseKey && isolationErrors.length === 0) {
      const client = createClient<Database>(databaseUrl, databaseKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      const { error } = await client
        .from('exams')
        .select('id', { count: 'exact', head: true })
      if (!error) database = 'ok'
    }
  } catch {
    database = 'unavailable'
  }

  const ready = environment !== null
    && database === 'ok'
    && isolationErrors.length === 0

  return NextResponse.json(
    {
      status: ready ? 'ok' : 'degraded',
      environment: environment ?? 'invalid',
      release: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || 'local',
      checks: {
        configuration: environment === null ? 'failed' : 'ok',
        isolation: isolationErrors.length === 0 ? 'ok' : 'failed',
        database,
      },
    },
    {
      status: ready ? 200 : 503,
      headers: {
        'Cache-Control': 'private, no-store',
        'X-Robots-Tag': 'noindex, nofollow, noarchive',
      },
    },
  )
}
