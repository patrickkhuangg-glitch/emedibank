import Link from 'next/link'
import { Container } from './container'
import { getUser, getProfile } from '@/lib/auth/dal'
import { signOutAction } from '@/lib/auth/actions'
import { ButtonLink, Button } from './ui/button'
import { Wordmark } from './ui/wordmark'

export async function SiteHeader() {
  const user = await getUser()
  const profile = user ? await getProfile() : null

  return (
    <header className="border-b border-border bg-surface/80 backdrop-blur">
      <Container className="flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center" aria-label="EMediBank home">
          <Wordmark className="text-xl" />
        </Link>

        <nav className="flex items-center gap-2 text-sm">
          <Link href="/pricing" className="px-3 py-2 text-muted transition-colors hover:text-foreground">
            Pricing
          </Link>
          {user ? (
            <>
              <Link href="/practice" className="px-3 py-2 text-muted transition-colors hover:text-foreground">
                Practice
              </Link>
              <Link href="/mock" className="px-3 py-2 text-muted transition-colors hover:text-foreground">
                Mock exams
              </Link>
              <Link href="/dashboard" className="px-3 py-2 text-muted transition-colors hover:text-foreground">
                Dashboard
              </Link>
              {profile?.role === 'admin' ? (
                <Link href="/admin" className="px-3 py-2 text-muted transition-colors hover:text-foreground">
                  Admin
                </Link>
              ) : null}
              <Link href="/account" className="px-3 py-2 text-muted transition-colors hover:text-foreground">
                Account
              </Link>
              <form action={signOutAction}>
                <Button variant="ghost" type="submit" className="px-3 py-2 text-muted">
                  Log out
                </Button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="px-3 py-2 text-muted transition-colors hover:text-foreground">
                Log in
              </Link>
              <ButtonLink href="/signup" className="ml-1">
                Sign up free
              </ButtonLink>
            </>
          )}
        </nav>
      </Container>
    </header>
  )
}
