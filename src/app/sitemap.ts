import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

// Public marketing surface. The app lives behind auth and is intentionally absent.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const routes = ['', '/pricing', '/login', '/signup']
  return routes.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: path === '' ? 1 : 0.6,
  }))
}
