import Link from 'next/link'
import { Container } from './container'

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-surface/80 backdrop-blur">
      <Container className="flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span
            aria-hidden
            className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-brand-foreground text-sm font-bold"
          >
            EP
          </span>
          <span>Exam Prep</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm text-muted">
          <Link href="/status" className="transition-colors hover:text-foreground">
            Status
          </Link>
        </nav>
      </Container>
    </header>
  )
}
