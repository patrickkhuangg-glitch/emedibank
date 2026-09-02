import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/container'
import { requireAdmin } from '@/lib/auth/dal'
import { getPendingMarkings } from '@/lib/essays/data'
import { TopUpForm } from './top-up-form'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Admin · Essay marking' }

export default async function AdminEssaysPage() {
  await requireAdmin()
  const queue = await getPendingMarkings()

  return (
    <Container className="py-14">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Essay marking</h1>
            <p className="mt-1 text-muted">Essays students have submitted for marking. Generate an AI draft, edit it, then approve to release it.</p>
          </div>
          <Link href="/admin" className="whitespace-nowrap rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-muted">← Admin</Link>
        </div>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Pending ({queue.length})</h2>
          {queue.length === 0 ? (
            <div className="mt-3 rounded-2xl border border-border bg-surface px-5 py-10 text-center text-sm text-muted">Nothing waiting to be marked.</div>
          ) : (
            <ul className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
              {queue.map((q) => (
                <li key={q.responseId}>
                  <Link href={`/admin/essays/${q.responseId}`} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-muted">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="rounded-full bg-brand-muted px-2 py-0.5 text-[11px] font-semibold text-brand">Task {q.task}</span>
                        <span className="font-medium">{q.theme}</span>
                        {q.hasAiDraft ? <span className="rounded-full bg-[#eaf5ff] px-2 py-0.5 text-[11px] font-semibold text-[#1b6fb3]">AI draft ready</span> : null}
                      </div>
                      <p className="mt-0.5 text-xs text-muted">
                        {q.studentName ?? 'Student'} · {q.wordCount} words · {q.timed ? 'timed' : 'untimed'}
                        {q.submittedAt ? ` · ${new Date(q.submittedAt).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Australia/Sydney' })}` : ''}
                      </p>
                    </div>
                    <span className="flex-none text-sm font-medium text-brand">Mark →</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Grant credits</h2>
          <p className="mt-1 text-sm text-muted">Top up a student&rsquo;s marking-credit balance by email.</p>
          <TopUpForm />
        </section>
      </div>
    </Container>
  )
}
