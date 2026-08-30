import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/container'
import { requireAdmin } from '@/lib/auth/dal'
import { createClient } from '@/lib/supabase/server'
import { PAGE_SIZE, type QFilter, type QuestionStatus } from '@/lib/admin/question-filter'
import { NewQuestionForm } from './new-question-form'
import { QuestionsManager, type Row } from './questions-manager'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Admin · Questions' }

function typeOf(d: unknown): string {
  const data = d as { statements?: unknown; mostLeast?: unknown; passage?: unknown } | null
  if (data?.statements) return 'Yes/No grid'
  if (data?.mostLeast) return 'Most/Least'
  if (data?.passage) return 'Passage MCQ'
  return 'MCQ'
}

export default async function AdminQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  await requireAdmin()
  const sp = await searchParams
  const filter: QFilter = {
    examId: sp.exam || null,
    subtestId: sp.subtest || null,
    status: (['published', 'draft'].includes(sp.status ?? '') ? sp.status : 'all') as QuestionStatus,
    search: sp.q ?? '',
  }
  const page = Math.max(1, Number(sp.page ?? 1) || 1)

  const supabase = await createClient()
  const [{ data: exams }, { data: subtests }] = await Promise.all([
    supabase.from('exams').select('id, name').order('created_at'),
    supabase.from('subtests').select('id, name, exam_id').order('sort_order'),
  ])
  const examName = new Map((exams ?? []).map((e) => [e.id, e.name]))
  const subtestLabel = new Map((subtests ?? []).map((s) => [s.id, `${examName.get(s.exam_id) ?? ''} · ${s.name}`]))
  const subIdsForExam = filter.examId
    ? (subtests ?? []).filter((s) => s.exam_id === filter.examId).map((s) => s.id)
    : []

  let query = supabase.from('questions').select('id, stem, published, video_status, subtest_id, data', { count: 'exact' })
  if (filter.subtestId) query = query.eq('subtest_id', filter.subtestId)
  else if (filter.examId) query = query.in('subtest_id', subIdsForExam)
  if (filter.status === 'published') query = query.eq('published', true)
  else if (filter.status === 'draft') query = query.eq('published', false)
  if (filter.search.trim()) query = query.ilike('stem', `%${filter.search.trim()}%`)
  query = query.order('created_at', { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  const { data: questions, count } = await query
  const rows: Row[] = (questions ?? []).map((q) => ({
    id: q.id,
    stem: q.stem,
    published: q.published,
    videoStatus: q.video_status,
    subtestLabel: subtestLabel.get(q.subtest_id) ?? '',
    type: typeOf(q.data),
  }))

  return (
    <Container className="py-12">
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Questions</h1>
          <p className="mt-1 text-muted">Filter, bulk-manage, author, and attach video explanations.</p>
          <Link href="/admin/questions/import" className="mt-3 inline-block rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-muted">
            Bulk import from CSV →
          </Link>
        </div>

        <details className="rounded-2xl border border-border bg-surface">
          <summary className="cursor-pointer list-none px-5 py-4 font-medium [&::-webkit-details-marker]:hidden">
            + New question
          </summary>
          <div className="border-t border-border p-5">
            <NewQuestionForm subtests={(subtests ?? []).map((s) => ({ id: s.id, name: s.name, exam: examName.get(s.exam_id) ?? '' }))} />
          </div>
        </details>

        <QuestionsManager
          rows={rows}
          total={count ?? 0}
          page={page}
          pageSize={PAGE_SIZE}
          filter={filter}
          exams={(exams ?? []).map((e) => ({ id: e.id, name: e.name }))}
          subtests={(subtests ?? []).map((s) => ({ id: s.id, name: s.name, examId: s.exam_id }))}
        />
      </div>
    </Container>
  )
}
