import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Container } from '@/components/container'
import { requireUser } from '@/lib/auth/dal'
import { createClient } from '@/lib/supabase/server'
import { canAccessExam } from '@/lib/access'
import { getSectionStats } from '@/lib/practice/stats'
import { PerformanceCard } from '@/components/practice/performance-card'
import { UpgradePrompt } from '@/components/ui/upgrade-prompt'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Practice questions' }

export default async function PracticeExamPage({ params }: { params: Promise<{ examSlug: string }> }) {
  const user = await requireUser()
  const { examSlug } = await params
  const supabase = await createClient()
  const { data: exam } = await supabase.from('exams').select('id, name, slug').eq('slug', examSlug).maybeSingle()
  if (!exam) notFound()

  const [stats, entitled] = await Promise.all([
    getSectionStats(exam.id, user.id),
    canAccessExam(user.id, exam.id),
  ])

  return (
    <Container className="py-10">
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* main column */}
        <main>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted">
                <Link href="/practice" className="hover:text-foreground">Practice</Link> / {exam.name}
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">Practice questions</h1>
            </div>
          </div>

          {!entitled ? (
            <div className="mt-6">
              <UpgradePrompt examName={exam.name} />
            </div>
          ) : null}

          <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-muted">New practice session</h2>

          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {stats.length === 0 ? (
              <li className="px-5 py-6 text-sm text-muted">No sections yet for this exam.</li>
            ) : (
              stats.map((s, idx) => {
                const href = entitled ? `/practice/${exam.slug}/${s.slug}` : '/pricing'
                const pct = s.total ? Math.round((s.attempted / s.total) * 100) : 0
                return (
                  <li key={s.id} className="eb-rise" style={{ animationDelay: `${idx * 60}ms` }}>
                    <Link
                      href={href}
                      className="eb-press group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-muted"
                    >
                      <span className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-brand-muted text-brand transition-transform duration-300 group-hover:scale-105">
                        <BookIcon />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{s.name}</span>
                          {!entitled ? <LockIcon /> : null}
                        </div>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                          <div
                            className="eb-bar h-full rounded-full bg-brand"
                            style={{ width: `${pct}%`, animationDelay: `${idx * 60 + 140}ms` }}
                          />
                        </div>
                      </div>
                      <span className="hidden flex-none tabular-nums text-sm text-muted sm:block">
                        {s.attempted} / {s.total} completed
                      </span>
                      <ChevronIcon />
                    </Link>
                  </li>
                )
              })
            )}
          </ul>
        </main>

        {/* sidebar */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <PerformanceCard stats={stats} />
        </aside>
      </div>
    </Container>
  )
}

function BookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v15H5.5A1.5 1.5 0 0 0 4 20.5z" />
      <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v15h5.5a1.5 1.5 0 0 1 1.5 1.5z" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg
      width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className="flex-none -translate-x-1 text-muted opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
      aria-hidden
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}
