import type { Metadata } from 'next'
import { Container } from '@/components/container'
import { requireUser, getProfile } from '@/lib/auth/dal'
import { listExams } from '@/lib/exam/current'
import { selectExamAction } from '@/lib/exam/actions'
import { hasActiveEntitlement } from '@/lib/access'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Choose your exam' }

const BLURB: Record<string, string> = {
  ucat: 'University Clinical Aptitude Test',
  gamsat: 'Graduate Medical School Admissions Test',
  isat: 'International Student Admissions Test',
}

export default async function ExamPickerPage() {
  const user = await requireUser('/app')
  const profile = await getProfile()
  const exams = await listExams()
  const entitled = await Promise.all(exams.map((e) => hasActiveEntitlement(user.id, e.id)))
  const first = profile?.full_name?.split(' ')[0]

  return (
    <Container className="py-16">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {first ? `Welcome back, ${first}.` : 'Welcome back.'}
        </h1>
        <p className="mt-2 text-muted">Which exam are you preparing for? Pick one to start this session. You can switch any time.</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {exams.map((e, i) => (
            <form key={e.id} action={selectExamAction.bind(null, e.slug)} className="eb-rise" style={{ animationDelay: `${i * 60}ms` }}>
              <button type="submit" className="eb-press group flex w-full items-center gap-4 rounded-2xl border border-border bg-surface p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md">
                <span className="grid h-12 w-12 flex-none place-items-center rounded-xl bg-brand-muted font-display text-base font-bold text-brand">
                  {e.name.slice(0, 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="font-display text-lg font-semibold">{e.name}</span>
                    {entitled[i] ? <span className="rounded-full bg-success-muted px-2 py-0.5 text-[11px] font-medium text-success">Unlocked</span> : null}
                  </span>
                  <span className="mt-0.5 block text-sm text-muted">{BLURB[e.slug] ?? 'Question bank & mocks'}</span>
                </span>
                <ArrowIcon />
              </button>
            </form>
          ))}

          {/* Interviews: not yet live */}
          <div className="eb-rise flex w-full cursor-not-allowed items-center gap-4 rounded-2xl border border-dashed border-border bg-surface/60 p-5 opacity-70" style={{ animationDelay: `${exams.length * 60}ms` }}>
            <span className="grid h-12 w-12 flex-none place-items-center rounded-xl bg-surface-muted font-display text-base font-bold text-muted">I</span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="font-display text-lg font-semibold text-muted">Interviews</span>
                <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-muted">Coming soon</span>
              </span>
              <span className="mt-0.5 block text-sm text-muted">MMI &amp; panel interview prep</span>
            </span>
          </div>
        </div>
      </div>
    </Container>
  )
}

function ArrowIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-none -translate-x-1 text-muted opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 group-hover:text-brand" aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}
