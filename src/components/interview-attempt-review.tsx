import Link from 'next/link'
import { InterviewPracticeTabs } from '@/components/interview-practice-tabs'

type InterviewAttempt = {
  id: string
  format: 'mmi' | 'panel'
  stationTitle: string
  questions: unknown
  durationSeconds: number
  createdAt: string
  audioUrl: string | null
}

export function InterviewAttemptReview({ attempts }: { attempts: InterviewAttempt[] }) {
  return (
    <main className="min-h-screen bg-background pb-16 text-foreground">
      <div className="mx-auto max-w-[1240px] px-5 pt-10 sm:px-8 sm:pt-14">
        <header className="max-w-3xl">
          <h1 className="text-balance font-display text-4xl font-semibold leading-[1.03] tracking-tight sm:text-5xl">Previous attempts</h1>
          <p className="mt-4 text-base leading-7 text-muted sm:text-lg">Revisit your recorded interview responses whenever you need. They are private to your account.</p>
        </header>

        <InterviewPracticeTabs active="review" />

        {attempts.length === 0 ? <EmptyState /> : <section className="mt-8" aria-label="Saved interview attempts">
          <p className="text-sm text-muted">{attempts.length} saved {attempts.length === 1 ? 'attempt' : 'attempts'}</p>
          <div className="mt-4 divide-y divide-border overflow-hidden rounded-2xl bg-surface eb-soft">
            {attempts.map((attempt) => <AttemptRow key={attempt.id} attempt={attempt} />)}
          </div>
        </section>}
      </div>
    </main>
  )
}

function EmptyState() {
  return (
    <section className="mt-8 max-w-2xl rounded-2xl bg-surface p-7 eb-soft sm:p-9">
      <h2 className="font-display text-2xl font-semibold tracking-tight">No saved attempts yet</h2>
      <p className="mt-3 max-w-xl text-sm leading-6 text-muted">Complete a recorded MMI station or panel interview set and its audio will appear here for you to review.</p>
      <Link href="/interviews/practice" className="eb-press mt-7 inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground">
        Choose a station <ArrowIcon />
      </Link>
    </section>
  )
}

function AttemptRow({ attempt }: { attempt: InterviewAttempt }) {
  const questionCount = Array.isArray(attempt.questions) ? attempt.questions.length : 0
  return (
    <article className="p-6 sm:p-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <span className="inline-flex rounded-full bg-brand-muted px-3 py-1.5 text-xs font-semibold text-brand">{attempt.format === 'mmi' ? 'MMI station' : 'Panel interview'}</span>
          <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight">{attempt.stationTitle}</h2>
          <p className="mt-2 text-sm text-muted">{formatAttemptDate(attempt.createdAt)} · {formatDuration(attempt.durationSeconds)} recorded{questionCount ? ` · ${questionCount} ${questionCount === 1 ? 'question' : 'questions'}` : ''}</p>
        </div>
        <span className="shrink-0 text-xs font-semibold text-muted">Private recording</span>
      </div>
      {attempt.audioUrl ? <audio className="mt-6 w-full" controls preload="metadata" src={attempt.audioUrl}>Your browser does not support audio playback.</audio> : <p className="mt-6 text-sm text-muted">This recording is temporarily unavailable. Refresh the page to try again.</p>}
    </article>
  )
}

function formatAttemptDate(date: string) {
  return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(date))
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function ArrowIcon() {
  return <svg aria-hidden viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10h11M11 5l5 5-5 5" /></svg>
}
