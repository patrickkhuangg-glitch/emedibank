import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Container } from '@/components/container'
import { requireUser } from '@/lib/auth/dal'
import { createClient } from '@/lib/supabase/server'
import { canAccessExam } from '@/lib/access'
import { getSectionStats, type SectionStat } from '@/lib/practice/stats'
import { getPracticeSessions, type PracticeSession } from '@/lib/practice/sessions'
import { isEssaySection } from '@/lib/essays/config'
import { PerformanceCard } from '@/components/practice/performance-card'
import { UpgradePrompt } from '@/components/ui/upgrade-prompt'
import { PracticeTabs } from './practice-tabs'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Practice questions' }

export default async function PracticeExamPage({ params }: { params: Promise<{ examSlug: string }> }) {
  const user = await requireUser()
  const { examSlug } = await params
  const supabase = await createClient()
  const { data: exam } = await supabase.from('exams').select('id, name, slug').eq('slug', examSlug).maybeSingle()
  if (!exam) notFound()

  const [stats, entitled, sessions] = await Promise.all([
    getSectionStats(exam.id, user.id),
    canAccessExam(user.id, exam.id),
    getPracticeSessions(user.id, exam.id),
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

          <PracticeTabs
            historyCount={sessions.length}
            newSession={<SectionList examSlug={exam.slug} stats={stats} entitled={entitled} />}
            history={<HistoryList sessions={sessions} />}
          />
        </main>

        {/* sidebar */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <PerformanceCard stats={stats} />
        </aside>
      </div>
    </Container>
  )
}

function SectionList({ examSlug, stats, entitled }: { examSlug: string; stats: SectionStat[]; entitled: boolean }) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
      {stats.length === 0 ? (
        <li className="px-5 py-6 text-sm text-muted">No sections yet for this exam.</li>
      ) : (
        stats.map((s, idx) => {
          const essay = isEssaySection(examSlug, s.slug)
          const href = !entitled ? '/pricing' : essay ? `/essays/${examSlug}/${s.slug}` : `/practice/${examSlug}/${s.slug}`
          const pct = s.total ? Math.round((s.attempted / s.total) * 100) : 0
          return (
            <li key={s.id} className="eb-rise" style={{ animationDelay: `${idx * 60}ms` }}>
              <Link href={href} className="eb-press group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-muted">
                <span className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-brand-muted text-brand transition-transform duration-300 group-hover:scale-105">
                  {essay ? <PenIcon /> : <BookIcon />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{s.name}</span>
                    {!entitled ? <LockIcon /> : null}
                  </div>
                  {essay ? (
                    <p className="mt-1 text-xs text-muted">Essay writing — timed &amp; untimed</p>
                  ) : (
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                      <div className="eb-bar h-full rounded-full bg-brand" style={{ width: `${pct}%`, animationDelay: `${idx * 60 + 140}ms` }} />
                    </div>
                  )}
                </div>
                {essay ? (
                  <span className="hidden flex-none rounded-full bg-brand-muted px-2.5 py-1 text-[11px] font-medium text-brand sm:block">Essays</span>
                ) : (
                  <span className="hidden flex-none tabular-nums text-sm text-muted sm:block">{s.attempted} / {s.total} completed</span>
                )}
                <ChevronIcon />
              </Link>
            </li>
          )
        })
      )}
    </ul>
  )
}

function fmtDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function HistoryList({ sessions }: { sessions: PracticeSession[] }) {
  if (sessions.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface px-5 py-12 text-center">
        <p className="text-sm font-medium">No practice sessions yet</p>
        <p className="mx-auto mt-1 max-w-xs text-sm text-muted">Finish a session and it will show up here with your score and time.</p>
      </div>
    )
  }
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
      {sessions.map((s, idx) => {
        const pct = s.total ? Math.round((s.correct / s.total) * 100) : 0
        const when = new Date(s.createdAt).toLocaleString('en-AU', {
          day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Australia/Sydney',
        })
        const modeLabel = s.mode === 'timed' ? 'Timed' : s.mode === 'review' ? 'Review' : 'Untimed'
        const title = s.tag || s.subtestName || 'Practice'
        const scoreCls = pct >= 70 ? 'text-[#157d72]' : pct >= 50 ? 'text-[#b45309]' : 'text-[#dc2626]'
        const content = (
          <>
            <span className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-brand-muted text-brand"><HistoryIcon /></span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-medium">{title}</span>
                {s.tag && s.subtestName ? <span className="text-xs text-muted">{s.subtestName}</span> : null}
                <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-muted">{modeLabel}</span>
              </div>
              <p className="mt-0.5 text-xs text-muted">{when}{s.timeSpentSeconds ? ` · ${fmtDuration(s.timeSpentSeconds)}` : ''}</p>
              <p className="mt-1 text-xs font-medium text-brand">{s.reviewAvailable ? 'Review answers and explanations →' : 'Summary only · completed before review history was enabled'}</p>
            </div>
            <div className="flex-none text-right">
              <div className="tabular-nums text-sm font-semibold">{s.correct}/{s.total}</div>
              <div className={`text-xs font-semibold ${scoreCls}`}>{pct}%</div>
            </div>
          </>
        )
        return (
          <li key={s.id} className="eb-rise" style={{ animationDelay: `${idx * 40}ms` }}>
            {s.reviewAvailable ? (
              <Link href={`/practice/review/${s.id}`} className="eb-press group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-muted">{content}</Link>
            ) : (
              <div className="flex items-center gap-4 px-5 py-4">{content}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function HistoryIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 3v5h5" />
      <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
      <path d="M12 7v5l3 2" />
    </svg>
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

function PenIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
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
