import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Container } from '@/components/container'
import { requireUser } from '@/lib/auth/dal'
import { createClient } from '@/lib/supabase/server'
import { canAccessExam } from '@/lib/access'
import { getSectionStats, getCategoryStats } from '@/lib/practice/stats'
import { PerformanceCard } from '@/components/practice/performance-card'
import { CategoryPicker } from './category-picker'

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
            <Link href={`/practice/${exam.slug}`} className="text-sm font-medium text-brand hover:underline">
              Edit
            </Link>
          </div>

          <CategoryPicker examSlug={exam.slug} subtestId={cats.subtest.id} categories={cats.categories} />
        </main>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <PerformanceCard stats={stats} />
        </aside>
      </div>
    </Container>
  )
}
