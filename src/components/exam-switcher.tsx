'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { selectExamAction } from '@/lib/exam/actions'
import { haptic } from '@/lib/haptics'
import { ExamHeaderBrand } from '@/components/exam-header-brand'
import type { ExamLite } from '@/lib/exam/current'
import type { InterfaceMode } from '@/lib/supabase/types'

/** Top-left LMS control: the current exam, with a dropdown to switch or reopen
 *  the picker. Switching submits a server action that re-scopes the session.
 *  The leading mark follows the account interface_mode (playful / clean). */
export function ExamSwitcher({ current, exams, variant = 'playful', compact = false }: { current: ExamLite | null; exams: ExamLite[]; variant?: InterfaceMode; compact?: boolean }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const interviewsActive = pathname.startsWith('/interviews')
  const activeSlug = interviewsActive ? 'interviews' : current?.slug
  const label = interviewsActive ? 'Interviews' : current?.name ?? 'Choose exam'
  return (
    <div className="relative min-w-0 shrink-0">
      <button
        onClick={() => { haptic(6); setOpen((o) => !o) }}
        aria-expanded={open}
        aria-label={`Studocyte ${label} — switch exam`}
        onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false) }}
        className="group flex min-h-11 items-center gap-2 rounded-xl py-1 pr-2 text-left transition-colors hover:bg-surface-muted active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        {compact ? <span className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-muted text-xs font-semibold text-brand" aria-hidden>{label.slice(0,1)}</span><span className="text-sm font-semibold">{label}</span></span> : <ExamHeaderBrand label={label} variant={variant} />}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden><path d="m6 9 6 6 6-6" /></svg>
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="eb-menu-surface absolute left-0 top-full z-50 mt-2 min-w-[15rem] max-w-[calc(100vw-2rem)]">
            <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">Switch exam</p>
            {exams.map((e) => {
              const isCurrent = activeSlug === e.slug
              return (
                <form key={e.id} action={selectExamAction.bind(null, e.slug)}>
                  <button type="submit" onClick={() => haptic(8)} data-selected={isCurrent} className={`eb-menu-item flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-surface-muted ${isCurrent ? 'font-medium text-foreground' : 'text-muted'}`}>
                    <span className="flex-1">{e.name}</span>
                    {isCurrent ? <CheckIcon /> : null}
                  </button>
                </form>
              )
            })}
            <div className="my-1 border-t border-border" />
            <Link href="/app" onClick={() => setOpen(false)} className="eb-menu-item flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-muted">
              All exam prep
            </Link>
          </div>
        </>
      ) : null}
    </div>
  )
}

function CheckIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-brand" aria-hidden><path d="m5 12 5 5L20 7" /></svg>
}
