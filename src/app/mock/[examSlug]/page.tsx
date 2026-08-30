import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Container } from '@/components/container'
import { requireUser } from '@/lib/auth/dal'
import { createClient } from '@/lib/supabase/server'
import { canAccessExam } from '@/lib/access'
import { mocksForExam } from '@/lib/mock/config'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ examSlug: string }>
}): Promise<Metadata> {
  const { examSlug } = await params
  return { title: `Mock exams · ${examSlug.toUpperCase()}` }
}

export default async function MockExamPage({ params }: { params: Promise<{ examSlug: string }> }) {
  const user = await requireUser()
  const { examSlug } = await params
  const supabase = await createClient()
  const { data: exam } = await supabase.from('exams').select('id, name, slug').eq('slug', examSlug).maybeSingle()
  if (!exam) notFound()

  const mocks = mocksForExam(exam.slug)
  const entitled = await canAccessExam(user.id, exam.id)

  return (
    <Container className="py-10">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm text-muted">
          <Link href="/mock" className="hover:text-foreground">Mock exams</Link> / {exam.name}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{exam.name} mock exams</h1>
        <p className="mt-2 max-w-prose text-muted">
          A full sitting under exam conditions: every section, back to back, timed to the real paper, in the
          test-day interface. Your first two mocks are free.
        </p>

        <ul className="mt-8 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {mocks.map((m, idx) => {
            const minutes = m.sections.reduce((n, s) => n + s.minutes, 0)
            const open = m.free || entitled
            const href = open ? `/mock/${exam.slug}/${m.id}` : '/pricing'
            const meta = `${m.sections.length} sections · ${minutes} min`

            const inner = (
              <div className="flex items-center gap-4 px-5 py-4">
                <span className={`grid h-11 w-11 flex-none place-items-center rounded-xl transition-transform duration-300 ${open ? 'bg-brand-muted text-brand group-hover:scale-105' : 'bg-surface-muted text-muted'}`}>
                  <ClipboardIcon />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{exam.name} {m.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${m.free ? 'bg-brand-muted text-brand' : 'bg-surface-muted text-muted'}`}>
                      {m.free ? 'Free' : 'Premium'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-muted tabular-nums">{meta}</p>
                </div>
                {open ? (
                  <span className="hidden text-sm font-medium text-brand sm:block">Start →</span>
                ) : (
                  <span className="flex-none rounded-full bg-surface-muted px-2.5 py-1 text-[11px] font-medium text-muted">Unlock</span>
                )}
              </div>
            )

            return (
              <li key={m.id} className="eb-rise" style={{ animationDelay: `${idx * 60}ms` }}>
                <Link href={href} className="group block transition-colors hover:bg-surface-muted">{inner}</Link>
              </li>
            )
          })}
        </ul>

        <div className="mt-6 rounded-xl border border-border bg-brand-muted/50 px-5 py-4 text-sm text-muted">
          Each mock draws a fresh set of questions and grades every section at the end. Prefer to drill one area?
          Build a focused set from{' '}
          <Link href={`/practice/${exam.slug}`} className="font-medium text-brand hover:underline">Practice questions</Link>.
        </div>
      </div>
    </Container>
  )
}

function ClipboardIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="8" y="3" width="8" height="4" rx="1" />
      <path d="M8 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <path d="M9 13h6M9 17h4" />
    </svg>
  )
}
