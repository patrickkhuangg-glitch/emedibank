'use client'
import { useState } from 'react'
import Link from 'next/link'
import { selectExamAction } from '@/lib/exam/actions'
import { haptic } from '@/lib/haptics'
import type { ExamLite } from '@/lib/exam/current'

/** Top-left LMS control: the current exam, with a dropdown to switch or reopen
 *  the picker. Switching submits a server action that re-scopes the session. */
export function ExamSwitcher({ current, exams }: { current: ExamLite | null; exams: ExamLite[] }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => { haptic(6); setOpen((o) => !o) }}
        aria-expanded={open}
        className="group flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 transition-colors hover:bg-surface-muted active:scale-[0.98]"
      >
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink font-display text-sm font-bold text-ink-foreground">M</span>
        <span className="font-display text-sm font-semibold">{current ? current.name : 'Choose exam'}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden><path d="m6 9 6 6 6-6" /></svg>
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="eb-expand absolute left-0 top-full z-50 mt-2 min-w-[15rem] rounded-xl border border-border bg-surface p-1.5 shadow-lg">
            <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">Switch exam</p>
            {exams.map((e) => {
              const isCurrent = current?.slug === e.slug
              return (
                <form key={e.id} action={selectExamAction.bind(null, e.slug)}>
                  <button type="submit" onClick={() => haptic(8)} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-surface-muted ${isCurrent ? 'font-medium text-foreground' : 'text-muted'}`}>
                    <span className="flex-1">{e.name}</span>
                    {isCurrent ? <CheckIcon /> : null}
                  </button>
                </form>
              )
            })}
            <div className="my-1 border-t border-border" />
            <Link href="/app" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-muted">
              All exams &amp; Interviews
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
