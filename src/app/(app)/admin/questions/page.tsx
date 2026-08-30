import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/container'
import { requireAdmin } from '@/lib/auth/dal'
import { createClient } from '@/lib/supabase/server'
import { togglePublishAction, deleteQuestionAction } from '@/lib/admin/question-actions'
import { VideoUpload } from './video-upload'
import { NewQuestionForm } from './new-question-form'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Admin · Questions' }

export default async function AdminQuestionsPage() {
  await requireAdmin()
  const supabase = await createClient()
  const [{ data: exams }, { data: subtests }, { data: questions }] = await Promise.all([
    supabase.from('exams').select('id, name').order('created_at'),
    supabase.from('subtests').select('id, name, exam_id').order('sort_order'),
    supabase.from('questions').select('id, stem, published, video_status, subtest_id, data').order('created_at', { ascending: false }),
  ])
  const examName = new Map((exams ?? []).map((e) => [e.id, e.name]))
  const subtestList = (subtests ?? []).map((s) => ({ id: s.id, name: s.name, exam: examName.get(s.exam_id) ?? '' }))
  const subtestLabel = new Map(subtestList.map((s) => [s.id, `${s.exam} · ${s.name}`]))

  const typeOf = (d: unknown): string => {
    const data = d as { statements?: unknown; mostLeast?: unknown; passage?: unknown } | null
    if (data?.statements) return 'Yes/No grid'
    if (data?.mostLeast) return 'Most/Least'
    if (data?.passage) return 'Passage MCQ'
    return 'MCQ'
  }

  return (
    <Container className="py-16">
      <div className="mx-auto max-w-3xl space-y-10">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Questions</h1>
          <p className="mt-1 text-muted">Author every UCAT question type and attach video explanations.</p>
          <Link href="/admin/questions/import" className="mt-3 inline-block rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-muted">Bulk import from CSV →</Link>
        </div>

        <NewQuestionForm subtests={subtestList} />

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">All questions ({(questions ?? []).length})</h2>
          {(questions ?? []).map((q) => (
            <div key={q.id} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted">{subtestLabel.get(q.subtest_id)}</p>
                <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] text-muted">{typeOf(q.data)}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm">{q.stem}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                <span className={`rounded-full px-2 py-0.5 ${q.published ? 'bg-success-muted text-success' : 'bg-surface-muted text-muted'}`}>{q.published ? 'Published' : 'Draft'}</span>
                <VideoUpload questionId={q.id} status={q.video_status} />
                <form action={togglePublishAction}>
                  <input type="hidden" name="id" value={q.id} />
                  <input type="hidden" name="next" value={(!q.published).toString()} />
                  <button className="text-muted hover:text-foreground">{q.published ? 'Unpublish' : 'Publish'}</button>
                </form>
                <form action={deleteQuestionAction}>
                  <input type="hidden" name="id" value={q.id} />
                  <button className="text-[#dc2626] hover:opacity-80">Delete</button>
                </form>
              </div>
            </div>
          ))}
        </section>
      </div>
    </Container>
  )
}
