import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'
import { isPublicProduction } from '@/lib/deployment-environment'

export const dynamic = 'force-dynamic'

// HTML routes expose noindex metadata where appropriate. Keep route handlers
// out of the crawl surface; blocking noindex pages here would prevent crawlers
// from seeing their indexing directive.
export default function robots(): MetadataRoute.Robots {
  if (!isPublicProduction()) {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
    }
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api', '/auth'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
