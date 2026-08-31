import 'server-only'
import { headers } from 'next/headers'

/** Absolute site origin known without a request (module/build time). Used for
 *  metadataBase, sitemap and robots, where there is no request context. Prefers
 *  NEXT_PUBLIC_SITE_URL; falls back to the production domain. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://studocyte.emeducate.com.au'

/** Absolute origin for building redirect/callback URLs. */
export async function getOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  const proto =
    h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}
