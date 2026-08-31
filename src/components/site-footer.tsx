import { Container } from './container'

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border">
      <Container className="flex h-16 items-center justify-between text-sm text-muted">
        <span>© {new Date().getFullYear()} Studocyte</span>
        <span>Part of EMeducate</span>
      </Container>
    </footer>
  )
}
