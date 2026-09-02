import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Container } from '@/components/container'
import { requireUser } from '@/lib/auth/dal'
import { createClient } from '@/lib/supabase/server'
import { canAccessExam } from '@/lib/access'
import { isEssaySection } from '@/lib/essays/config'
import { getSectionStats, getCategoryStats } from '@/lib/practice/stats'
import { PerformanceCard } from '@/components/practice/performance-card'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ examSlug: string; subtestSlug: string }>
}): Promise<Metadata> {
  const { subtestSlug } = await params
  return { title: `Select category · ${subtestSlug}` }
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ examSlug: string; subtestSlug: string }>
}) {
  const user = await requireUser()
  const { examSlug, subtestSlug } = await params
  // Essay sections (GAMSAT Section II) have no MCQ categories — send them to the writer.
  if (isEssaySection(examSlug, subtestSlug)) redirect(`/essays/${examSlug}/${subtestSlug}`)
  const supabase = await createClient()

  const { data: exam } = await supabase.from('exams').select('id, name, slug').eq('slug', examSlug).maybeSingle()
  if (!exam) notFound()

  // Questions are paid — bounce non-entitled users back to the section list (paywall there).
  if (!(await canAccessExam(user.id, exam.id))) redirect(`/practice/${exam.slug}`)

  const { data: subtest } = await supabase
    .from('subtests')
    .select('id')
    .eq('exam_id', exam.id)
    .eq('slug', subtestSlug)
    .maybeSingle()
  if (!subtest) notFound()

  const [stats, cats] = await Promise.all([
    getSectionStats(exam.id, user.id),
    getCategoryStats(user.id, exam.slug, exam.id, subtest.id),
  ])
  if (!cats) notFound()

  return (
    <Container className="py-10">
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <main>
          <Link href={`/practice/${exam.slug}`} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
            <span aria-hidden>←</span> Back
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Select category</h1>

          <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-5 py-4">
            <div className="flex items-baseline gap-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">Section</span>
              <span className="font-medium">{cats.subtest.name}</span>
            </div>
            <Link href={`/practice/${exam.slug}`} className="text-sm font-medium text-brand hover:underline">Edit</Link>
          </div>

          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {cats.categories.map((cat, idx) => {
              const pct = cat.total ? Math.round((cat.attempted / cat.total) * 100) : 0
              const disabled = cat.total === 0
              const href = `/practice/${exam.slug}/${cats.subtest.slug}/start?cat=${encodeURIComponent(cat.key)}`
              const body = (
                <>
                  <span className={`grid h-11 w-11 flex-none place-items-center rounded-xl transition-transform duration-300 ${disabled ? 'bg-surface-muted text-muted' : 'bg-brand-muted text-brand group-hover:scale-105'}`}>
                    <BookIcon />
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className={`font-medium ${disabled ? 'text-muted' : ''}`}>{cat.label}</span>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                      <div className="eb-bar h-full rounded-full bg-brand" style={{ width: `${pct}%`, animationDelay: `${idx * 45 + 120}ms` }} />
                    </div>
                  </div>
                  <span className="hidden flex-none tabular-nums text-sm text-muted sm:block">{cat.attempted} / {cat.total} completed</span>
                  {disabled
                    ? <span className="flex-none rounded-full bg-surface-muted px-2.5 py-1 text-[11px] font-medium text-muted">Coming soon</span>
                    : <ChevronIcon />}
                </>
              )
              return (
                <li key={cat.key || '__all'} className="eb-rise" style={{ animationDelay: `${idx * 45}ms` }}>
                  {disabled ? (
                    <div className="flex items-center gap-4 px-5 py-4">{body}</div>
                  ) : (
                    <Link href={href} className="eb-press group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-muted">{body}</Link>
                  )}
                </li>
              )
            })}
          </ul>
        </main>

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
function ChevronIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className="flex-none -translate-x-1 text-muted opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" aria-hidden>
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}
