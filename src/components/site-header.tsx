import Link from 'next/link'
import { Container } from './container'
import { getUser, getProfile } from '@/lib/auth/dal'
import { Wordmark } from './ui/wordmark'
import { SiteNav } from './site-nav'

export async function SiteHeader() {
  const user = await getUser()
  const profile = user ? await getProfile() : null

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/80 backdrop-blur">
      <Container className="flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center" aria-label="EMediBank home">
          <Wordmark className="text-xl" />
        </Link>
        <SiteNav authed={!!user} isAdmin={profile?.role === 'admin'} />
      </Container>
    </header>
  )
}
