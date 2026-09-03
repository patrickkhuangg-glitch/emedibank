import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

// HTML routes expose noindex metadata where appropriate. Keep route handlers
// out of the crawl surface; blocking noindex pages here would prevent crawlers
// from seeing their indexing directive.
export default function robots(): MetadataRoute.Robots {
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
