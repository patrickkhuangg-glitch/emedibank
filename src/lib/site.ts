import 'server-only'
import { headers } from 'next/headers'

/** Absolute site origin known without a request (module/build time). Used for
 *  metadataBase, sitemap and robots, where there is no request context. Prefers
 *  NEXT_PUBLIC_SITE_URL; falls back to the production domain. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://studocyte.emeducate.com.au'

/** Absolute origin for building redirect/callback URLs (auth emails, OAuth,
 *  Stripe). Request headers are only trusted in local development: on a hosted
 *  deployment a forged Host/X-Forwarded-Host could otherwise point password
 *  reset and sign-in links at an attacker's domain. */
export async function getOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  const proto =
    h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}
