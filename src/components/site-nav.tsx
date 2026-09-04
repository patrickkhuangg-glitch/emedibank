'use client'
import Link from 'next/link'
import { useLinkStatus } from 'next/link'
import { usePathname } from 'next/navigation'
import { type ReactNode } from 'react'
import { signOutAction } from '@/lib/auth/actions'
import { haptic } from '@/lib/haptics'

type Item = { href: string; label: string; icon: ReactNode }

export function SiteNav({ isAdmin, currentExamSlug }: { isAdmin: boolean; currentExamSlug: string | null }) {
  const pathname = usePathname()
  const interviewsActive = pathname.startsWith('/interviews')
  // Practice/Mock scope to the chosen exam; without one, send to the picker.
  const practiceHref = currentExamSlug ? `/practice/${currentExamSlug}` : '/app'
  const mockHref = currentExamSlug ? `/mock/${currentExamSlug}` : '/app'

  const items: Item[] = interviewsActive
    ? [
        { href: '/interviews', label: 'Overview', icon: <GridIcon /> },
        { href: '/interviews/practice', label: 'Practice', icon: <QuestionIcon /> },
        { href: '/interviews/stories', label: 'Stories', icon: <InterviewIcon /> },
        { href: '/interviews/resources', label: 'Resources', icon: <ExamIcon /> },
        { href: '/study-plan', label: 'Study Plan', icon: <PlanIcon /> },
        { href: '/bookings', label: 'Bookings', icon: <CalendarIcon /> },
        ...(isAdmin ? [{ href: '/admin', label: 'Admin', icon: <ShieldIcon /> }] : []),
        { href: '/account', label: 'Account', icon: <UserIcon /> },
      ]
    : [
        { href: '/dashboard', label: 'Dashboard', icon: <GridIcon /> },
        { href: practiceHref, label: 'Practice', icon: <QuestionIcon /> },
        { href: mockHref, label: 'Mock exams', icon: <ExamIcon /> },
        { href: '/study-plan', label: 'Study Plan', icon: <PlanIcon /> },
        { href: '/bookings', label: 'Bookings', icon: <CalendarIcon /> },
        ...(isAdmin ? [{ href: '/admin', label: 'Admin', icon: <ShieldIcon /> }] : []),
        { href: '/account', label: 'Account', icon: <UserIcon /> },
      ]

  const active = (item: Item) => {
    if (item.label === 'Practice') return pathname.startsWith('/practice') || pathname.startsWith('/interviews/practice') || pathname.startsWith('/interviews/review')
    if (item.label === 'Mock exams') return pathname.startsWith('/mock')
    if (item.href === '/dashboard') return pathname === '/dashboard'
    if (item.href === '/interviews') return pathname === '/interviews'
    return pathname === item.href || pathname.startsWith(`${item.href}/`)
  }

  return (
    <nav className="flex items-center gap-1 text-sm">
      {items.map((it) => (
        <PillLink key={it.label} {...it} active={active(it)} />
      ))}
      <form action={signOutAction}>
        <button type="submit" onClick={() => haptic(8)} className="rounded-full px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground active:scale-95">
          Log out
        </button>
      </form>
    </nav>
  )
}

function PillLink({ href, label, icon, active }: Item & { active: boolean }) {
  return (
    <Link
      href={href}
      onClick={() => haptic(8)}
      aria-current={active ? 'page' : undefined}
      className={`group inline-flex items-center gap-2 rounded-full px-3 py-2 font-medium transition-all duration-200 active:scale-95 ${
        active
          ? 'bg-surface-muted text-foreground shadow-sm'
          : 'text-muted hover:-translate-y-0.5 hover:bg-surface-muted/70 hover:text-foreground hover:shadow-sm'
      }`}
    >
      <PillIcon>{icon}</PillIcon>
      <span className="hidden sm:inline">{label}</span>
    </Link>
  )
}

/** Swaps the icon for a spinner the moment a navigation to this link is pending. */
function PillIcon({ children }: { children: ReactNode }) {
  const { pending } = useLinkStatus()
  return (
    <span className="grid h-[18px] w-[18px] place-items-center transition-transform duration-200 group-hover:scale-110">
      {pending ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : children}
    </span>
  )
}

const P = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }

function GridIcon() {
  return <svg {...P}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
}
function QuestionIcon() {
  return <svg {...P}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M9.2 9a2.8 2.8 0 0 1 5.3 1.2c0 1.8-2.6 2-2.6 3.5" /><path d="M12 17.5v.01" /></svg>
}
function ExamIcon() {
  return <svg {...P}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18" /><path d="M7 14h5" /><path d="M15 14h2" /></svg>
}
function InterviewIcon() {
  return <svg {...P}><path d="M4 5h16v11H8l-4 4V5Z" /><path d="M8 9h8M8 12h5" /></svg>
}
function UserIcon() {
  return <svg {...P}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
}
function ShieldIcon() {
  return <svg {...P}><path d="M12 3 5 6v5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z" /></svg>
}
function PlanIcon() {
  return <svg {...P}><rect x="5" y="3" width="14" height="18" rx="2" /><path d="m8 9 1.5 1.5L12 8M14.5 10H16M8 15l1.5 1.5L12 14M14.5 16H16" /></svg>
}
function CalendarIcon() {
  return <svg {...P}><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16M8 14h2M14 14h2" /></svg>
}
