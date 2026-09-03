import { Container } from './container'

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border">
      <Container className="flex h-16 items-center justify-between text-sm text-muted">
        <span>© {new Date().getFullYear()} Studocyte</span>
        <span><a className="hover:text-foreground" href="https://emeducate.com.au/privacy">Privacy</a> · Part of EMeducate</span>
      </Container>
    </footer>
  )
}
