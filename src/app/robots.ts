import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

// Marketing pages are crawlable; the signed-in app and API are not.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/app', '/dashboard', '/account', '/admin', '/exams', '/practice', '/mock', '/session', '/api'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
