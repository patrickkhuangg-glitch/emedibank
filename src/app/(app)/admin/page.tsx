import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/container'
import { requireAdmin } from '@/lib/auth/dal'
import { getPendingMarkings } from '@/lib/essays/data'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Admin · Studocyte' }

export default async function AdminPage() {
  await requireAdmin()
  const supabase = await createClient()
  const [queue, exams, sections, published, drafts, studyPlans] = await Promise.all([
    getPendingMarkings(),
    supabase.from('exams').select('id', { count: 'exact', head: true }).eq('active', true),
    supabase.from('subtests').select('id,is_free'),
    supabase.from('questions').select('id', { count: 'exact', head: true }).eq('published', true),
    supabase.from('questions').select('id', { count: 'exact', head: true }).eq('published', false),
    supabase.from('study_plans').select('id', { count: 'exact', head: true }),
  ])
  const subtests = sections.data ?? []
  const freeCount = subtests.filter((section) => section.is_free).length

  return <Container className="py-10 sm:py-14"><main className="mx-auto max-w-6xl">
    <header className="grid gap-8 border-b border-border pb-9 lg:grid-cols-[1fr_auto] lg:items-end">
      <div><p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-brand">Studocyte operations</p><h1 className="mt-3 max-w-2xl font-display text-4xl font-bold tracking-tight text-balance sm:text-5xl">Everything that needs your judgement, in one place.</h1><p className="mt-4 max-w-2xl text-base leading-7 text-muted">Control student access, review submitted work and maintain the question bank without moving through the student-facing platform.</p></div>
      <Link href="/dashboard" className="eb-press inline-flex h-10 items-center justify-center rounded-full border border-border bg-surface px-4 text-sm font-semibold transition-colors hover:border-brand/30 hover:bg-brand-muted">View student dashboard</Link>
    </header>

    <section aria-label="Admin overview" className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-4">
      <Metric value={queue.length} label="Essays waiting" accent={queue.length > 0} />
      <Metric value={freeCount} label={`Free sections of ${subtests.length}`} />
      <Metric value={published.count ?? 0} label="Published questions" />
      <Metric value={drafts.count ?? 0} label={`${exams.count ?? 0} active exams · drafts`} />
    </section>

    <section className="mt-10"><div className="flex items-baseline justify-between gap-4"><h2 className="font-display text-2xl font-bold">Workspaces</h2><p className="hidden text-sm text-muted sm:block">Choose the job you need to do</p></div>
      <div className="mt-5 grid gap-4 lg:grid-cols-12">
        <Workspace href="/admin/essays" className="lg:col-span-7" eyebrow="Review queue" title="Mark essays" description="Generate an AI draft, edit it in your own voice, then approve the final feedback for the student." count={queue.length} countLabel="awaiting review" icon={<EssayIcon />} tone="brand" action="Open marking queue" />
        <Workspace href="/admin/access" className="lg:col-span-5" eyebrow="Student access" title="Free content controls" description="Choose which exam sections students can open without a paid entitlement. Changes apply immediately." count={freeCount} countLabel="currently free" icon={<AccessIcon />} action="Manage access" />
        <Workspace href="/admin/questions" className="lg:col-span-5" eyebrow="Content library" title="Add and manage questions" description="Author individual questions, import complete banks, publish drafts and remove content in bulk." count={published.count ?? 0} countLabel="questions live" icon={<QuestionIcon />} action="Open question bank" />
        <Workspace href="/admin/interviews" className="lg:col-span-7" eyebrow="Tutor review" title="Review interview stations" description="The review home for submitted MMI stations, tutor notes and approved student feedback." count={0} countLabel="waiting now" icon={<InterviewIcon />} tone="ink" action="Open station reviews" />
        <Workspace href="/admin/study-plans" className="lg:col-span-12" eyebrow="Tutoring packages" title="Manage student study plans" description="Assign one-to-one hours, interview support and masterclass places to each student, then keep their remaining inclusions up to date." count={studyPlans.count ?? 0} countLabel="packages" icon={<PlanIcon />} action="Open study plans" />
      </div>
    </section>

    <section className="mt-10 flex flex-col gap-4 rounded-2xl bg-brand-muted/55 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">Add content</h2><p className="mt-1 text-sm text-muted">Create one question manually or import a complete CSV question bank.</p></div><div className="flex flex-wrap gap-2"><Link href="/admin/questions#new-question" className="eb-press rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">New question</Link><Link href="/admin/questions/import" className="eb-press rounded-full border border-brand/20 bg-surface px-4 py-2 text-sm font-semibold text-brand hover:border-brand/40">Bulk import</Link></div></section>
  </main></Container>
}

function Metric({ value, label, accent = false }: { value: number; label: string; accent?: boolean }) { return <div className="bg-surface px-4 py-5 sm:px-5"><p className={`font-mono text-2xl font-semibold tabular-nums ${accent ? 'text-brand' : 'text-foreground'}`}>{value.toLocaleString()}</p><p className="mt-1 text-xs text-muted">{label}</p></div> }
function Workspace({ href, className, eyebrow, title, description, count, countLabel, icon, tone = 'surface', action }: { href: string; className: string; eyebrow: string; title: string; description: string; count: number; countLabel: string; icon: React.ReactNode; tone?: 'surface' | 'brand' | 'ink'; action: string }) {
  const palette = tone === 'brand' ? 'bg-brand text-brand-foreground' : tone === 'ink' ? 'bg-ink text-white' : 'border border-border bg-surface text-foreground'
  const secondary = tone === 'surface' ? 'text-muted' : 'text-white/70'
  return <Link href={href} className={`eb-press group relative min-h-64 overflow-hidden rounded-[1.4rem] p-6 transition-transform duration-300 hover:-translate-y-0.5 ${palette} ${className}`}><div className="relative z-10 flex h-full flex-col"><div className="flex items-start justify-between gap-5"><span className={`grid h-12 w-12 place-items-center rounded-2xl ${tone === 'surface' ? 'bg-brand-muted text-brand' : 'bg-white/12 text-white'}`}>{icon}</span><div className="text-right"><p className="font-mono text-2xl font-semibold tabular-nums">{count.toLocaleString()}</p><p className={`text-xs ${secondary}`}>{countLabel}</p></div></div><p className={`mt-8 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] ${secondary}`}>{eyebrow}</p><h3 className="mt-2 font-display text-2xl font-bold tracking-tight">{title}</h3><p className={`mt-2 max-w-xl text-sm leading-6 ${secondary}`}>{description}</p><p className="mt-auto pt-6 text-sm font-semibold">{action} <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span></p></div>{tone !== 'surface' && <span className="pointer-events-none absolute -bottom-24 -right-16 h-56 w-56 rounded-full border border-white/10" />}</Link>
}
function EssayIcon() { return <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 20h16M6 17l1-5L17 2l5 5-10 10-6 1Z"/><path d="m14 5 5 5"/></svg> }
function AccessIcon() { return <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M8 12h8M12 8v8"/></svg> }
function QuestionIcon() { return <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M7 3h10a2 2 0 0 1 2 2v14l-7-3-7 3V5a2 2 0 0 1 2-2Z"/><path d="M9.8 8.5a2.3 2.3 0 1 1 3.1 2.2c-.7.3-.9.7-.9 1.3M12 14.5h.01"/></svg> }
function InterviewIcon() { return <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 5h16v11H8l-4 4V5Z"/><path d="M8 9h8M8 12h5"/></svg> }
function PlanIcon() { return <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="m8 9 1.5 1.5L12 8M14 10h2M8 15l1.5 1.5L12 14M14 16h2"/></svg> }
