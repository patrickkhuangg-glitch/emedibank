import Link from 'next/link'
import { Container } from '@/components/container'

export default function Home() {
  return (
    <Container className="py-20 sm:py-28">
      <div className="mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden />
          GAMSAT now · UCAT &amp; interview coming
        </span>

        <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
          Medical-admissions exam prep, done properly.
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted">
          Question banks, video courses, analytics and tutor feedback — one
          platform built to grow across every admissions exam. We&rsquo;re
          starting with GAMSAT.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <span className="cursor-not-allowed rounded-lg bg-brand px-5 py-3 font-medium text-brand-foreground opacity-60">
            Get started (coming soon)
          </span>
          <Link
            href="/status"
            className="rounded-lg border border-border bg-surface px-5 py-3 font-medium transition-colors hover:bg-surface-muted"
          >
            System status
          </Link>
        </div>
      </div>

      <div className="mx-auto mt-20 grid max-w-4xl gap-4 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="rounded-lg border border-border bg-surface p-6"
          >
            <h2 className="font-semibold">{f.title}</h2>
            <p className="mt-2 text-sm text-muted">{f.body}</p>
          </div>
        ))}
      </div>
    </Container>
  )
}

const FEATURES = [
  {
    title: 'Question banks',
    body: 'Exam-accurate practice with detailed explanations, filtered by topic and difficulty.',
  },
  {
    title: 'Video courses',
    body: 'Structured lessons that build the fundamentals, on your schedule.',
  },
  {
    title: 'Analytics & feedback',
    body: 'Track progress over time and get targeted feedback from tutors.',
  },
]
