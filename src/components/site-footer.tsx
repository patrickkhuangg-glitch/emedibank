import { Container } from './container'

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border">
      <Container className="flex flex-wrap items-center justify-between gap-4 py-5 text-xs text-muted">
        <span>© {new Date().getFullYear()} Studocyte by EMeducate Education · ABN 13 869 236 642 · No GST charged</span>
        <span><a href="https://emeducate.com.au/privacy">Privacy</a> · <a href="https://emeducate.com.au/studocyte/terms">Terms</a> · <a href="https://emeducate.com.au/refunds">Refunds</a> · <a href="https://emeducate.com.au/acceptable-use">Acceptable use</a> · <a href="mailto:support@emeducate.com.au">Support</a></span>
        <p>Independent preparation; not affiliated with ACER, the UCAT Consortium or ISAT providers.</p>
      </Container>
    </footer>
  )
}
