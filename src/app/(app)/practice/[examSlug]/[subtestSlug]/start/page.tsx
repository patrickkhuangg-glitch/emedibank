import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Container } from '@/components/container'
import { requireUser } from '@/lib/auth/dal'
import { createClient } from '@/lib/supabase/server'
import { canAccessExam } from '@/lib/access'
import { getSectionStats } from '@/lib/practice/stats'
import { countSets } from '@/lib/practice/sets'
import { sectionMinutes, minutesPerSet, timedPresets, questionsForMinutes } from '@/lib/practice/timing'
import { PerformanceCard } from '@/components/practice/performance-card'
import { TimingPicker } from './timing-picker'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Select timing' }

export default async function TimingPage({
  params,
  searchParams,
}: {
  params: Promise<{ examSlug: string; subtestSlug: string }>
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const user = await requireUser()
  const { examSlug, subtestSlug } = await params
  const cat = (await searchParams).cat ?? ''
  const supabase = await createClient()

  const { data: exam } = await supabase.from('exams').select('id, name, slug').eq('slug', examSlug).maybeSingle()
  if (!exam) notFound()
  if (!(await canAccessExam(user.id, exam.id))) redirect(`/practice/${exam.slug}`)

  const { data: subtest } = await supabase
    .from('subtests')
    .select('id, name, slug')
    .eq('exam_id', exam.id)
    .eq('slug', subtestSlug)
    .maybeSingle()
  if (!subtest) notFound()

  const [stats, availableSets] = await Promise.all([
    getSectionStats(exam.id, user.id),
    countSets(subtest.id, cat),
  ])
  const categoryLabel = cat || `All ${subtest.name}`

  // Timed options: per-section presets, each labelled by its approximate question
  // count where the section is proportioned that way, plus the full section.
  const presets = timedPresets(exam.slug, subtest.slug)
  const secMin = sectionMinutes(exam.slug, subtest.slug)
  const timedOptions = [
    ...presets.map((m) => ({ minutes: m, questions: questionsForMinutes(exam.slug, subtest.slug, m), full: false })),
    ...(secMin && !presets.includes(secMin)
      ? [{ minutes: secMin, questions: questionsForMinutes(exam.slug, subtest.slug, secMin), full: true }]
      : []),
  ]

  return (
    <Container className="py-10">
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <main>
          <Link href={`/practice/${exam.slug}/${subtest.slug}`} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
            <span aria-hidden>←</span> Back
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Select timing</h1>

          <div className="mt-6 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            <SummaryRow label="Section" value={subtest.name} editHref={`/practice/${exam.slug}`} />
            <SummaryRow label="Category" value={categoryLabel} editHref={`/practice/${exam.slug}/${subtest.slug}`} />
          </div>

          <TimingPicker
            examSlug={exam.slug}
            subtestId={subtest.id}
            categoryKey={cat}
            timedOptions={timedOptions}
            minutesPerSet={minutesPerSet(exam.slug, subtest.slug)}
            availableSets={availableSets}
          />
        </main>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <PerformanceCard stats={stats} />
        </aside>
      </div>
    </Container>
  )
}

function SummaryRow({ label, value, editHref }: { label: string; value: string; editHref: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-4">
      <div className="flex items-baseline gap-4">
        <span className="w-20 flex-none text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <Link href={editHref} className="text-sm font-medium text-brand hover:underline">Edit</Link>
    </div>
  )
}
