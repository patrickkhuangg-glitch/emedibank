import type { Metadata } from 'next'
import { Container } from '@/components/container'
import { requireAdmin } from '@/lib/auth/dal'
import { createClient } from '@/lib/supabase/server'
import {
  createQuestionAction,
  togglePublishAction,
  deleteQuestionAction,
} from '@/lib/admin/question-actions'
import { VideoUpload } from './video-upload'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Admin · Questions' }

export default async function AdminQuestionsPage() {
  await requireAdmin()
  const supabase = await createClient()
  const [{ data: exams }, { data: subtests }, { data: questions }] = await Promise.all([
    supabase.from('exams').select('id, name').order('created_at'),
    supabase.from('subtests').select('id, name, exam_id').order('sort_order'),
    supabase
      .from('questions')
      .select('id, stem, published, video_status, subtest_id, difficulty')
      .order('created_at', { ascending: false }),
  ])
  const examName = new Map((exams ?? []).map((e) => [e.id, e.name]))
  const subtestLabel = new Map(
    (subtests ?? []).map((s) => [s.id, `${examName.get(s.exam_id) ?? ''} · ${s.name}`]),
  )

  const inputCls =
    'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand'

  return (
    <Container className="py-16">
      <div className="mx-auto max-w-3xl space-y-10">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Questions</h1>
          <p className="mt-1 text-muted">Author MCQ questions and attach video explanations.</p>
        </div>

        {/* Create */}
        <form action={createQuestionAction} className="space-y-4 rounded-2xl border border-border bg-surface p-6">
          <h2 className="font-semibold">New question</h2>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Subtest</span>
            <select name="subtest_id" required className={inputCls}>
              {(subtests ?? []).map((s) => (
                <option key={s.id} value={s.id}>{subtestLabel.get(s.id)}</option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Topic</span>
              <input name="topic" className={inputCls} placeholder="e.g. Ratios" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Difficulty</span>
              <select name="difficulty" className={inputCls}>
                <option value="">—</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Tags (comma-separated: question types / skills)</span>
            <input name="tags" className={inputCls} placeholder="e.g. ratios, unit-conversion" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Question stem</span>
            <textarea name="stem" required rows={3} className={inputCls} />
          </label>
          <div className="space-y-2">
            <span className="text-sm font-medium">Options (select the correct one)</span>
            {['A', 'B', 'C', 'D'].map((L) => (
              <div key={L} className="flex items-center gap-2">
                <input type="radio" name="correct" value={L} defaultChecked={L === 'A'} aria-label={`Mark ${L} correct`} />
                <span className="w-4 text-sm font-semibold">{L}</span>
                <input name={`opt_${L}`} className={inputCls} placeholder={`Option ${L}`} />
              </div>
            ))}
          </div>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Written explanation</span>
            <textarea name="explanation_text" rows={3} className={inputCls} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="published" /> Publish now
          </label>
          <button className="rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-brand-foreground hover:opacity-90">
            Create question
          </button>
        </form>

        {/* List */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            All questions ({(questions ?? []).length})
          </h2>
          {(questions ?? []).map((q) => (
            <div key={q.id} className="rounded-lg border border-border bg-surface p-4">
              <p className="text-xs text-muted">{subtestLabel.get(q.subtest_id)}</p>
              <p className="mt-1 line-clamp-2 text-sm">{q.stem}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                <span className={`rounded-full px-2 py-0.5 ${q.published ? 'bg-success-muted text-success' : 'bg-surface-muted text-muted'}`}>
                  {q.published ? 'Published' : 'Draft'}
                </span>
                <VideoUpload questionId={q.id} status={q.video_status} />
                <form action={togglePublishAction}>
                  <input type="hidden" name="id" value={q.id} />
                  <input type="hidden" name="next" value={(!q.published).toString()} />
                  <button className="text-muted hover:text-foreground">
                    {q.published ? 'Unpublish' : 'Publish'}
                  </button>
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
