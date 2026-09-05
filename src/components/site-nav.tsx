'use client'

import Link from 'next/link'
import { useLinkStatus } from 'next/link'
import { usePathname } from 'next/navigation'
import { type ReactNode } from 'react'
import { signOutAction } from '@/lib/auth/actions'
import { haptic } from '@/lib/haptics'
import type { UserRole } from '@/lib/supabase/types'

type Item = { href: string; label: string; icon: ReactNode }

export function SiteNav({ role, currentExamSlug }: { role: UserRole; currentExamSlug: string | null }) {
  const pathname = usePathname()
  const items = navItems(role, currentExamSlug)

  const active = (item: Item) => {
    if (item.label === 'Practice') return pathname.startsWith('/practice') || pathname.startsWith('/interviews/practice') || pathname.startsWith('/interviews/review')
    if (item.label === 'Mock exams') return pathname.startsWith('/mock')
    if (item.href === '/dashboard' || item.href === '/admin') return pathname === item.href
    return pathname === item.href || pathname.startsWith(`${item.href}/`)
  }

  return (
    <>
      <nav aria-label={`${roleLabel(role)} navigation`} className="hidden items-center gap-0.5 text-sm lg:flex">
        {items.map((item) => <PillLink key={item.label} {...item} active={active(item)} />)}
        <LogoutButton />
      </nav>
      <details className="group relative lg:hidden">
        <summary className="eb-press flex cursor-pointer list-none items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-2 text-sm font-semibold text-foreground marker:content-none">
          <MenuIcon />
          Menu
        </summary>
        <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[min(20rem,calc(100vw-3rem))] overflow-hidden rounded-3xl border border-border bg-surface p-2 shadow-xl">
          <div className="px-3 pb-2 pt-2 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-muted">{roleLabel(role)} workspace</div>
          <nav aria-label={`${roleLabel(role)} mobile navigation`} className="grid gap-1">
            {items.map((item) => <MenuLink key={item.label} {...item} active={active(item)} />)}
          </nav>
          <form action={signOutAction} className="mt-2 border-t border-border pt-2">
            <button type="submit" onClick={() => haptic(8)} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-medium text-muted transition-colors hover:bg-surface-muted hover:text-foreground">
              <LogoutIcon />
              Log out
            </button>
          </form>
        </div>
      </details>
    </>
  )
}

function navItems(role: UserRole, currentExamSlug: string | null): Item[] {
  if (role === 'admin') return [
    { href: '/bookings', label: 'Bookings', icon: <CalendarIcon /> },
    { href: '/account', label: 'Account', icon: <UserIcon /> },
    { href: '/admin/students', label: 'Students', icon: <StudentsIcon /> },
    { href: '/admin', label: 'Admin', icon: <ShieldIcon /> },
  ]
  if (role === 'tutor') return [
    { href: '/bookings', label: 'Bookings', icon: <CalendarIcon /> },
    { href: '/account', label: 'Account', icon: <UserIcon /> },
    { href: '/students', label: 'Students', icon: <StudentsIcon /> },
  ]
  const practiceHref = currentExamSlug ? `/practice/${currentExamSlug}` : '/app'
  const mockHref = currentExamSlug ? `/mock/${currentExamSlug}` : '/app'
  return [
    { href: '/dashboard', label: 'Dashboard', icon: <GridIcon /> },
    { href: practiceHref, label: 'Practice', icon: <QuestionIcon /> },
    { href: mockHref, label: 'Mock exams', icon: <ExamIcon /> },
    { href: '/study-plan', label: 'Study Plan', icon: <PlanIcon /> },
    { href: '/bookings', label: 'Bookings', icon: <CalendarIcon /> },
    { href: '/account', label: 'Account', icon: <UserIcon /> },
  ]
}

function roleLabel(role: UserRole) { return role === 'admin' ? 'Admin' : role === 'tutor' ? 'Tutor' : 'Student' }

function PillLink({ href, label, icon, active }: Item & { active: boolean }) {
  return <Link href={href} onClick={() => haptic(8)} aria-current={active ? 'page' : undefined} className={`group inline-flex items-center gap-2 rounded-full px-2.5 py-2 font-medium transition-all duration-200 active:scale-95 ${active ? 'bg-surface-muted text-foreground shadow-sm' : 'text-muted hover:-translate-y-0.5 hover:bg-surface-muted/70 hover:text-foreground'}`}><PillIcon>{icon}</PillIcon><span>{label}</span></Link>
}

function MenuLink({ href, label, icon, active }: Item & { active: boolean }) {
  return <Link href={href} onClick={() => haptic(8)} aria-current={active ? 'page' : undefined} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors ${active ? 'bg-brand-muted text-brand' : 'text-foreground hover:bg-surface-muted'}`}>{icon}<span>{label}</span>{active ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand" /> : null}</Link>
}

function LogoutButton() { return <form action={signOutAction}><button type="submit" onClick={() => haptic(8)} className="rounded-full px-2.5 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground active:scale-95">Log out</button></form> }
function PillIcon({ children }: { children: ReactNode }) { const { pending } = useLinkStatus(); return <span className="grid h-[18px] w-[18px] place-items-center transition-transform duration-200 group-hover:scale-110">{pending ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : children}</span> }

const P = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
function GridIcon() { return <svg {...P}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg> }
function QuestionIcon() { return <svg {...P}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M9.2 9a2.8 2.8 0 0 1 5.3 1.2c0 1.8-2.6 2-2.6 3.5" /><path d="M12 17.5v.01" /></svg> }
function ExamIcon() { return <svg {...P}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18" /><path d="M7 14h5" /><path d="M15 14h2" /></svg> }
function UserIcon() { return <svg {...P}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg> }
function StudentsIcon() { return <svg {...P}><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0M16 11a3 3 0 0 0 0-6M17 15a5 5 0 0 1 4 5" /></svg> }
function ShieldIcon() { return <svg {...P}><path d="M12 3 5 6v5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z" /></svg> }
function PlanIcon() { return <svg {...P}><rect x="5" y="3" width="14" height="18" rx="2" /><path d="m8 9 1.5 1.5L12 8M14.5 10H16M8 15l1.5 1.5L12 14M14.5 16H16" /></svg> }
function CalendarIcon() { return <svg {...P}><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16M8 14h2M14 14h2" /></svg> }
function LogoutIcon() { return <svg {...P}><path d="M10 17l5-5-5-5M15 12H3M15 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" /></svg> }
function MenuIcon() { return <svg {...P}><path d="M4 7h16M4 12h16M4 17h16" /></svg> }
