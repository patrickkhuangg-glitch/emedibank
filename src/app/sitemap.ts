import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'
import { isPublicProduction } from '@/lib/deployment-environment'

export const dynamic = 'force-dynamic'

// Public marketing surface. The app lives behind auth and is intentionally absent.
export default function sitemap(): MetadataRoute.Sitemap {
  if (!isPublicProduction()) return []

  const now = new Date()
  const routes = ['', '/pricing', '/interview-preparation', '/isat-preparation', '/ucat-preparation', '/gamsat-preparation']
  return routes.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: path === '' ? 1 : 0.6,
  }))
}
