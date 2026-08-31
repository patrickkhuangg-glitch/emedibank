'use client'
import { useEffect, useState, useTransition } from 'react'
import { selectExamAction } from '@/lib/exam/actions'
import { haptic } from '@/lib/haptics'
import { Wordmark } from '@/components/ui/wordmark'
import { Spinner } from '@/components/spinner'

const BLURB: Record<string, string> = {
  ucat: 'University Clinical Aptitude Test',
  gamsat: 'Graduate Medical School Admissions Test',
  isat: 'International Student Admissions Test',
}

type Exam = { id: string; slug: string; name: string; entitled: boolean }

/** Full-screen first-run greeting. Covers the whole LMS, then fades out cleanly
 *  once an exam is chosen before the destination loads underneath. */
export function ExamPicker({ first, exams }: { first: string | null; exams: Exam[] }) {
  const [greeting, setGreeting] = useState('Welcome back')
  const [leaving, setLeaving] = useState<string | null>(null)
  const [, start] = useTransition()

  useEffect(() => {
    const h = new Date().getHours()
    // Varies by the viewer's local hour (0-4 counts as evening, not morning).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- greeting needs the client's local time
    setGreeting(h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening')
  }, [])

  function pick(slug: string) {
    if (leaving) return
    haptic(12)
    setLeaving(slug)
    // let the overlay fade before the navigation begins
    setTimeout(() => start(() => { selectExamAction(slug) }), 460)
  }

  return (
    <div
      className={`fixed inset-0 z-[70] overflow-auto bg-background transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${leaving ? 'scale-[0.98] opacity-0' : 'scale-100 opacity-100'}`}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(60rem 32rem at 50% -12%, rgba(21,125,114,0.10), transparent 70%)' }} />
      <div className="relative mx-auto flex min-h-[100dvh] max-w-3xl flex-col justify-center px-6 py-16">
        <div className="eb-rise">
          <Wordmark className="text-lg" />
          <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            {greeting}{first ? `, ${first}` : ''}.
          </h1>
          <p className="mt-3 text-lg text-muted">What would you like to work on today?</p>
        </div>

        <div className="mt-9 grid gap-4 sm:grid-cols-2">
          {exams.map((e, i) => {
            const going = leaving === e.slug
            return (
              <button
                key={e.id}
                onClick={() => pick(e.slug)}
                disabled={!!leaving}
                style={{ animationDelay: `${90 + i * 70}ms` }}
                className={`eb-rise eb-press eb-soft group flex items-center gap-4 rounded-3xl border bg-surface p-5 text-left transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:border-brand/40 disabled:cursor-default ${going ? 'border-brand ring-2 ring-brand' : 'border-border'}`}
              >
                <span className="grid h-12 w-12 flex-none place-items-center rounded-2xl bg-brand-muted font-display text-base font-bold text-brand transition-transform duration-300 group-hover:scale-110">
                  {e.name.slice(0, 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="font-display text-lg font-semibold">{e.name}</span>
                    {e.entitled ? <span className="rounded-full bg-success-muted px-2 py-0.5 text-[11px] font-medium text-success">Unlocked</span> : null}
                  </span>
                  <span className="mt-0.5 block text-sm text-muted">{BLURB[e.slug] ?? 'Question bank & mocks'}</span>
                </span>
                {going ? <Spinner size={20} /> : <Arrow />}
              </button>
            )
          })}

          <div className="eb-rise flex items-center gap-4 rounded-3xl border border-dashed border-border bg-surface/60 p-5 opacity-70" style={{ animationDelay: `${90 + exams.length * 70}ms` }}>
            <span className="grid h-12 w-12 flex-none place-items-center rounded-2xl bg-surface-muted font-display text-base font-bold text-muted">I</span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="font-display text-lg font-semibold text-muted">Interviews</span>
                <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-muted">Coming soon</span>
              </span>
              <span className="mt-0.5 block text-sm text-muted">MMI &amp; panel interview prep</span>
            </span>
          </div>
        </div>

        <p className="eb-rise mt-6 text-xs text-muted" style={{ animationDelay: '420ms' }}>You can switch exams any time from the top-left.</p>
      </div>
    </div>
  )
}

function Arrow() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-none -translate-x-1 text-muted opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:text-brand group-hover:opacity-100" aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}
