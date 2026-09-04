'use client'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'

// Fluid mobile menu (Apple lens): a hamburger that morphs to an X, opening a
// translucent sheet that materializes from its top-right trigger origin over a
// scrim, with staggered links. Dismisses on scrim / link / Escape / resize, and
// locks body scroll while open. The overlay is portaled to <body> so the glass
// header's backdrop-filter doesn't trap its fixed positioning. Motion collapses
// to a plain cross-fade under reduced-motion (see globals.css).

type LinkItem = { label: string; href: string; external?: boolean }
type Group = { title: string; items: LinkItem[] }

const GROUPS: Group[] = [
  { title: 'Courses', items: [
    { label: 'UCAT', href: '/#exams' },
    { label: 'GAMSAT', href: '/#exams' },
    { label: 'ISAT', href: '/#exams' },
    { label: 'Interviews', href: '/interviews' },
  ] },
  { title: 'Explore', items: [
    { label: 'Pricing', href: '/pricing' },
    { label: 'How it works', href: '/#how' },
    { label: 'The exam interface', href: '/#interface' },
    { label: 'FAQ', href: '/#faq' },
  ] },
  { title: 'Company', items: [
    { label: 'About', href: '/#why' },
    { label: 'Contact', href: 'mailto:hello@emeducate.com.au' },
    { label: 'Part of EMeducate ↗', href: 'https://emeducate.com.au', external: true },
  ] },
  { title: 'Region & account', items: [
    { label: 'Australia & NZ', href: '/pricing' },
    { label: 'United Kingdom', href: '/pricing' },
    { label: 'Log in', href: '/login' },
  ] },
]

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)

  // Lock scroll, wire Escape, and close if the viewport grows to desktop.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const mq = window.matchMedia('(min-width: 768px)')
    const onMq = (e: MediaQueryListEvent) => { if (e.matches) setOpen(false) }
    window.addEventListener('keydown', onKey)
    mq.addEventListener('change', onMq)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
      mq.removeEventListener('change', onMq)
    }
  }, [open])

  let idx = 0 // running index for the staggered reveal

  return (
    <>
      <button
        type="button"
        className="eb-burger md:hidden"
        data-open={open}
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={() => setOpen((o) => !o)}
      >
        <i /><i /><i />
      </button>

      {mounted && createPortal(
        <>
          <div className="eb-scrim" data-open={open} onClick={() => setOpen(false)} aria-hidden />
          <div id="mobile-menu" className="eb-sheet eb-glass" data-open={open} role="dialog" aria-modal="true" aria-label="Menu">
            {GROUPS.map((g) => (
              <div key={g.title}>
                <div className="eb-grp">{g.title}</div>
                {g.items.map((it) => (
                  <SheetLink key={it.label} item={it} delay={0.05 + idx++ * 0.035} onNavigate={() => setOpen(false)} />
                ))}
              </div>
            ))}
            <div className="eb-divide" />
            <Link
              href="/app"
              onClick={() => setOpen(false)}
              className="mx-1.5 mt-2 flex items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3.5 font-display text-base font-semibold text-brand-foreground"
              style={{ opacity: 0, animation: open ? `eb-rise 0.5s var(--ease-out) both` : undefined, animationDelay: `${0.05 + idx * 0.035}s` }}
            >
              Open Studocyte <ArrowUpRight />
            </Link>
          </div>
        </>,
        document.body,
      )}
    </>
  )
}

function SheetLink({ item, delay, onNavigate }: { item: LinkItem; delay: number; onNavigate: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="eb-item"
      style={{ animationDelay: `${delay}s` }}
    >
      {item.label}
    </Link>
  )
}

function ArrowUpRight() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M7 17 17 7M8 7h9v9" /></svg>
}
