import 'server-only'

/** Absolute site origin known without a request (module/build time). Used for
 *  metadataBase, sitemap and robots, where there is no request context. Prefers
 *  NEXT_PUBLIC_SITE_URL; falls back to the production domain. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://studocyte.emeducate.com.au'

/** Absolute origin for building redirect/callback URLs. */
export async function getOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL
  if (!configured) throw new Error('NEXT_PUBLIC_SITE_URL must be configured for this environment.')
  const url = new URL(configured)
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash
    || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost','127.0.0.1'].includes(url.hostname)))) {
    throw new Error('NEXT_PUBLIC_SITE_URL must be a trusted site origin.')
  }
  return url.origin
}
