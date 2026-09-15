import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createClient } from '@supabase/supabase-js'

export const STAGING_PROJECT = 'gwlplbtxmhgttsgywvky'
export const STAGING_APP = 'https://staging.studocyte.emeducate.com.au'
export const STAGING_SUPABASE_URL = `https://${STAGING_PROJECT}.supabase.co`

let cachedClients
let cachedManagementToken

export const quoteSql = (value) => `'${String(value).replaceAll("'", "''")}'`

export async function stagingSql(query, readOnly = true) {
  if (!cachedManagementToken) {
    for (const account of ['access-token', 'supabase']) {
      try {
        cachedManagementToken = (await promisify(execFile)(
          'security',
          ['find-generic-password', '-s', 'Supabase CLI', '-a', account, '-w'],
        )).stdout.trim()
        if (cachedManagementToken) break
      } catch {}
    }
  }
  if (!cachedManagementToken) throw new Error('Supabase sign-in unavailable')

  const response = await fetch(
    `https://api.supabase.com/v1/projects/${STAGING_PROJECT}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cachedManagementToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, read_only: readOnly }),
      signal: AbortSignal.timeout(60_000),
    },
  )
  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      `Staging database HTTP ${response.status}; SQLSTATE ${body.match(/ERROR:\s*([A-Z0-9]{5})/)?.[1] ?? 'unknown'} (details withheld)`,
    )
  }
  return response.json()
}

export async function stagingClients() {
  if (cachedClients) return cachedClients

  const supabaseBin = '/Users/patrick/.npm/_npx/aa8e5c70f9d8d161/node_modules/.bin/supabase'
  const { stdout } = await promisify(execFile)(
    supabaseBin,
    ['projects', 'api-keys', '--project-ref', STAGING_PROJECT, '--reveal', '--output', 'json'],
    { maxBuffer: 1024 * 1024, timeout: 60_000 },
  )
  const keys = JSON.parse(stdout)
  const secret = keys.find((key) => key.type === 'secret')?.api_key
  const publicKey = keys.find((key) => key.type === 'publishable')?.api_key
  if (!secret || !publicKey) throw new Error('Staging project keys are unavailable')

  cachedClients = {
    admin: createClient(STAGING_SUPABASE_URL, secret, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
    publicKey,
  }
  return cachedClients
}

export function requireStagingApproval(flag) {
  if (!process.argv.includes(flag)) {
    throw new Error(`Explicit staging acceptance flag required: ${flag}`)
  }
}
