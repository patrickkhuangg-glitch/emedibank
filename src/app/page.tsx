import Link from 'next/link'
import { Container } from '@/components/container'

export default function Home() {
  return (
    <Container className="py-20 sm:py-28">
      <div className="mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden />
          UCAT · GAMSAT · ISAT · Interviews
        </span>

        <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
          Every question, explained.
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted">
          Exam-accurate question banks with written and video explanations that show
          exactly how to reach the answer — across every medical-admissions exam.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="rounded-lg bg-brand px-5 py-3 font-medium text-brand-foreground transition-opacity hover:opacity-90"
          >
            Start free
          </Link>
          <Link
            href="/pricing"
            className="rounded-lg border border-border bg-surface px-5 py-3 font-medium transition-colors hover:bg-surface-muted"
          >
            See pricing
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
    body: 'Exam-accurate practice across UCAT, GAMSAT and ISAT, filtered by subtest and difficulty.',
  },
  {
    title: 'Video explanations',
    body: 'Every question worked through on video — the premium way to learn from your mistakes.',
  },
  {
    title: 'Timed mock exams',
    body: 'Sit full papers in a faithful test interface, with your progress tracked over time.',
  },
]
