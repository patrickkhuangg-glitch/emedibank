import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Container } from '@/components/container'
import { requireUser } from '@/lib/auth/dal'
import { createClient } from '@/lib/supabase/server'
import { canAccessExam } from '@/lib/access'
import { isEssaySection } from '@/lib/essays/config'
import { getEssayPrompts, getEssayResponses, getEssayCredits, type EssayResponseView } from '@/lib/essays/data'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Written Communication · Essays' }

export default async function EssaySectionPage({
  params,
}: {
  params: Promise<{ examSlug: string; subtestSlug: string }>
}) {
  const user = await requireUser()
  const { examSlug, subtestSlug } = await params
  if (!isEssaySection(examSlug, subtestSlug)) redirect(`/practice/${examSlug}/${subtestSlug}`)

  const supabase = await createClient()
  const { data: exam } = await supabase.from('exams').select('id, name, slug').eq('slug', examSlug).maybeSingle()
  if (!exam) notFound()
  if (!(await canAccessExam(user.id, exam.id))) redirect(`/practice/${exam.slug}`)

  const { data: subtest } = await supabase
    .from('subtests').select('id, name, slug').eq('exam_id', exam.id).eq('slug', subtestSlug).maybeSingle()
  if (!subtest) notFound()

  const prompts = await getEssayPrompts(subtest.id)
  const responses = await getEssayResponses(prompts.map((p) => p.id))
  const credits = await getEssayCredits()
  const attemptsByPrompt = new Map<string, number>()
  for (const r of responses) attemptsByPrompt.set(r.promptId, (attemptsByPrompt.get(r.promptId) ?? 0) + 1)
  const hasTaskA = prompts.some((p) => p.task === 'A')
  const hasTaskB = prompts.some((p) => p.task === 'B')

  return (
    <Container className="py-10">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm text-muted">
          <Link href="/practice" className="hover:text-foreground">Practice</Link> /{' '}
          <Link href={`/practice/${exam.slug}`} className="hover:text-foreground">{exam.name}</Link> / Written Communication
        </p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">Written Communication</h1>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium" title="Credits for tutor marking">
            <CoinIcon /> {credits} credit{credits === 1 ? '' : 's'}
          </span>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Section II is two essay tasks. Read a theme and its quotes, then write an extended response — timed to build exam stamina, or untimed while you develop your ideas. Submit for tutor marking to get graded feedback (2 credits each).
        </p>

        {/* Random sitting — topic concealed */}
        <div className="mt-7 rounded-2xl border border-border bg-gradient-to-br from-brand-muted/60 to-surface p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-brand">Start a random essay</h2>
          <p className="mt-1 text-sm text-muted">Commit to a task and get a random topic — the quotes appear only when you begin, like the real sitting.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {hasTaskA ? <RandomButton href={`/essays/${exam.slug}/${subtest.slug}/random?task=A`} label="Random Task A" /> : null}
            {hasTaskB ? <RandomButton href={`/essays/${exam.slug}/${subtest.slug}/random?task=B`} label="Random Task B" /> : null}
            {!hasTaskA && !hasTaskB ? <span className="text-sm text-muted">No prompts published yet.</span> : null}
          </div>
        </div>

        {/* Prompt list */}
        <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-muted">Or choose a specific topic</h2>
        {prompts.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-border bg-surface px-5 py-10 text-center">
            <p className="text-sm font-medium">No essay themes published yet</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-muted">New Section II prompts will appear here.</p>
          </div>
        ) : (
          <ul className="mt-3 space-y-3">
            {prompts.map((p, idx) => {
              const attempts = attemptsByPrompt.get(p.id) ?? 0
              return (
                <li key={p.id} className="eb-rise" style={{ animationDelay: `${idx * 50}ms` }}>
                  <Link
                    href={`/essays/${exam.slug}/${subtest.slug}/${p.id}`}
                    className="eb-press group flex items-start gap-4 rounded-2xl border border-border bg-surface px-5 py-4 transition-colors hover:bg-surface-muted"
                  >
                    <span className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-brand-muted text-brand transition-transform duration-300 group-hover:scale-105">
                      <PenIcon />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-brand-muted px-2 py-0.5 text-[11px] font-semibold text-brand">Task {p.task}</span>
                        {attempts > 0 ? <span className="text-[11px] text-muted">{attempts} attempt{attempts === 1 ? '' : 's'}</span> : null}
                      </div>
                      <p className="mt-1 font-medium">{p.theme}</p>
                      <p className="mt-0.5 text-xs text-muted">{p.quotes.length} quote{p.quotes.length === 1 ? '' : 's'} · suggested {p.suggestedMinutes} min</p>
                    </div>
                    <span className="mt-2 flex-none text-sm font-medium text-brand">Write →</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}

        {/* Saved essays */}
        <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-muted">Your essays</h2>
        {responses.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-border bg-surface px-5 py-10 text-center">
            <p className="text-sm font-medium">No essays yet</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-muted">Write a response and it will be saved here — drafts to resume and submitted essays to review.</p>
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {responses.map((r, idx) => {
              const cta = r.status === 'draft' ? 'Resume'
                : r.markingStatus === 'approved' ? 'View feedback' : 'Review'
              return (
                <li key={r.id} className="eb-rise" style={{ animationDelay: `${idx * 35}ms` }}>
                  <Link
                    href={`/essays/${exam.slug}/${subtest.slug}/${r.promptId}?resume=${r.id}`}
                    className="eb-press flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-muted"
                  >
                    <span className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-brand-muted text-brand"><PenIcon /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-medium">{r.theme}</span>
                        <StatusBadge status={r.status} />
                        <MarkingBadge status={r.markingStatus} />
                        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-muted">{r.timed ? `Timed · ${r.durationMinutes ?? ''} min` : 'Untimed'}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted">{r.wordCount} word{r.wordCount === 1 ? '' : 's'} · {fmtWhen(r.updatedAt)}</p>
                    </div>
                    <span className="flex-none text-sm font-medium text-brand">{cta} →</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Container>
  )
}

function StatusBadge({ status }: { status: EssayResponseView['status'] }) {
  return status === 'submitted' ? (
    <span className="rounded-full bg-[#e6f5ee] px-2 py-0.5 text-[11px] font-semibold text-[#157d72]">Submitted</span>
  ) : (
    <span className="rounded-full bg-[#fdf3e0] px-2 py-0.5 text-[11px] font-semibold text-[#b45309]">Draft</span>
  )
}

function MarkingBadge({ status }: { status: EssayResponseView['markingStatus'] }) {
  if (status === 'approved') return <span className="rounded-full bg-[#eaf5ff] px-2 py-0.5 text-[11px] font-semibold text-[#1b6fb3]">Marked ✓</span>
  if (status === 'pending') return <span className="rounded-full bg-[#f3eaff] px-2 py-0.5 text-[11px] font-semibold text-[#6a45c9]">Marking pending</span>
  return null
}

function RandomButton({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="eb-press inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground shadow-sm transition-transform hover:scale-[1.02]">
      <DiceIcon /> {label}
    </Link>
  )
}

function CoinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-brand" aria-hidden>
      <circle cx="12" cy="12" r="9" /><path d="M12 7v10M9.5 9.5a2.5 2 0 0 1 5 0c0 1-1 1.5-2.5 2s-2.5 1-2.5 2a2.5 2 0 0 0 5 0" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function DiceIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="8.5" cy="8.5" r="1.1" fill="currentColor" /><circle cx="15.5" cy="8.5" r="1.1" fill="currentColor" /><circle cx="12" cy="12" r="1.1" fill="currentColor" /><circle cx="8.5" cy="15.5" r="1.1" fill="currentColor" /><circle cx="15.5" cy="15.5" r="1.1" fill="currentColor" />
    </svg>
  )
}

function fmtWhen(iso: string): string {
  return new Date(iso).toLocaleString('en-AU', {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Australia/Sydney',
  })
}

function PenIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}
