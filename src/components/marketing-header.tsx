'use client'
import Link from 'next/link'
import { useEffect, useState, type ReactNode } from 'react'
import { Container } from './container'
import { Wordmark } from './ui/wordmark'
import { MobileNav } from './mobile-nav'

// Public site chrome. A translucent glass layer (content scrolls under it) that
// only grows its divider + soft lift once you scroll — Apple's scroll-edge, not
// a permanent 1px border. Desktop keeps the pure-CSS hover dropdowns; below md
// the links live in the fluid MobileNav sheet.
export function MarketingHeader() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-50 eb-glass border-b transition-[box-shadow,border-color] duration-300 ${
        scrolled ? 'border-border shadow-[0_2px_28px_-18px_rgba(31,27,48,0.32)]' : 'border-transparent'
      }`}
    >
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center" aria-label="Studocyte home">
          <Wordmark className="text-xl" />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Dropdown label="Courses">
            <MenuLink href="/#exams">UCAT</MenuLink>
            <MenuLink href="/#exams">GAMSAT</MenuLink>
            <MenuLink href="/#exams">ISAT</MenuLink>
            <MenuLink href="/#exams">Interviews <Soon /></MenuLink>
          </Dropdown>
          <NavLink href="/pricing">Pricing</NavLink>
          <Dropdown label="Resources">
            <MenuLink href="/#how">How it works</MenuLink>
            <MenuLink href="/#interface">The exam interface</MenuLink>
            <MenuLink href="/#faq">FAQ</MenuLink>
          </Dropdown>
          <Dropdown label="Company">
            <MenuLink href="/#why">About</MenuLink>
            <MenuLink href="mailto:hello@emeducate.com.au">Contact</MenuLink>
            <MenuLink href="https://emeducate.com.au/studocyte" external>Studocyte by EMeducate ↗</MenuLink>
          </Dropdown>
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden md:block">
            <Dropdown label="ANZ" leading={<GlobeIcon />} align="right">
              <MenuLink href="/pricing">Australia &amp; NZ</MenuLink>
              <MenuLink href="/pricing">United Kingdom</MenuLink>
              <MenuLink href="/pricing">Hong Kong</MenuLink>
              <MenuLink href="/pricing">Singapore</MenuLink>
            </Dropdown>
          </div>
          <Link href="/login" className="hidden rounded-full px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground md:inline">
            Log in
          </Link>
          <Link
            href="/app"
            className="eb-press inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-ink-foreground transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_34px_-16px_rgba(31,27,48,0.4)]"
          >
            Open Studocyte <ArrowUpRight />
          </Link>
          <MobileNav />
        </div>
      </Container>
    </header>
  )
}

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="rounded-full px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-muted/70 hover:text-foreground">
      {children}
    </Link>
  )
}

function Dropdown({ label, children, leading, align = 'left' }: { label: string; children: ReactNode; leading?: ReactNode; align?: 'left' | 'right' }) {
  return (
    <div className="group relative">
      <button className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-muted/70 hover:text-foreground group-focus-within:text-foreground">
        {leading}
        {label}
        <Chevron />
      </button>
      <div
        className={`invisible absolute top-full ${align === 'right' ? 'right-0' : 'left-0'} z-50 min-w-[13rem] translate-y-1 pt-2 opacity-0 transition-all duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100`}
      >
        <div className="overflow-hidden rounded-xl border border-border bg-surface p-1.5 shadow-[0_12px_40px_-18px_rgba(31,27,48,0.4)]">{children}</div>
      </div>
    </div>
  )
}

function MenuLink({ href, children, external }: { href: string; children: ReactNode; external?: boolean }) {
  return (
    <Link
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-surface-muted"
    >
      {children}
    </Link>
  )
}

function Soon() {
  return <span className="ml-auto rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-medium text-muted">Soon</span>
}

function Chevron() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
}
function GlobeIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></svg>
}
function ArrowUpRight() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M7 17 17 7M8 7h9v9" /></svg>
}
