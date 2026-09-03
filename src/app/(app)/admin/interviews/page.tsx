import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/container'
import { requireAdmin } from '@/lib/auth/dal'

export const metadata: Metadata = { title: 'Admin · Interview reviews' }

export default async function AdminInterviewReviewsPage() {
  await requireAdmin()
  return <Container className="py-10 sm:py-14"><main className="mx-auto max-w-4xl">
    <Link href="/admin" className="text-sm font-medium text-muted transition-colors hover:text-foreground">← Admin dashboard</Link>
    <header className="mt-5 border-b border-border pb-8"><p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-brand">Tutor review</p><h1 className="mt-2 font-display text-4xl font-bold tracking-tight">Interview station reviews</h1><p className="mt-3 max-w-2xl text-muted">Submitted MMI stations will arrive here for tutor notes, scoring and approval before feedback is released.</p></header>
    <section className="mt-8 overflow-hidden rounded-2xl border border-border bg-surface"><div className="flex items-center justify-between border-b border-border px-5 py-4"><div><h2 className="font-semibold">Review queue</h2><p className="mt-0.5 text-xs text-muted">Oldest submissions will appear first</p></div><span className="rounded-full bg-surface-muted px-2.5 py-1 font-mono text-xs text-muted">0 waiting</span></div>
      <div className="grid min-h-72 place-items-center px-6 py-12 text-center"><div className="max-w-sm"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-muted text-brand"><QueueIcon /></span><h3 className="mt-5 font-display text-xl font-bold">No station submissions yet</h3><p className="mt-2 text-sm leading-6 text-muted">The review queue is ready in Admin. Student recording and submission will be connected when the interview-station LMS is built.</p></div></div>
    </section>
    <section className="mt-5 grid gap-3 sm:grid-cols-3"><Stage number="1" label="Student submits"/><Stage number="2" label="Tutor reviews"/><Stage number="3" label="Feedback released"/></section>
  </main></Container>
}
function Stage({ number, label }: { number: string; label: string }) { return <div className="rounded-xl bg-surface-muted px-4 py-3"><span className="font-mono text-xs text-brand">0{number}</span><p className="mt-1 text-sm font-semibold">{label}</p></div> }
function QueueIcon() { return <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 5h16v11H8l-4 4V5Z"/><path d="M8 9h8M8 12h5"/></svg> }
