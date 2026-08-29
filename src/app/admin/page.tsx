import type { Metadata } from 'next'
import { Container } from '@/components/container'
import { requireAdmin } from '@/lib/auth/dal'
import { createClient } from '@/lib/supabase/server'
import { setSubtestFreeAction } from '@/lib/admin/actions'
import type { Subtest } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Admin · Free tier' }

export default async function AdminPage() {
  await requireAdmin()
  const supabase = await createClient()
  const [{ data: exams }, { data: subtests }] = await Promise.all([
    supabase.from('exams').select('id, name').order('created_at'),
    supabase.from('subtests').select('*').order('sort_order'),
  ])

  const byExam = new Map<string, Subtest[]>()
  for (const s of subtests ?? []) {
    const list = byExam.get(s.exam_id) ?? []
    list.push(s)
    byExam.set(s.exam_id, list)
  }

  return (
    <Container className="py-16">
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Free-tier control</h1>
          <p className="mt-1 text-muted">
            Toggle which subtests are free. Changes take effect immediately for every free user.
          </p>
        </div>

        {(exams ?? []).map((exam) => {
          const list = byExam.get(exam.id) ?? []
          return (
            <section key={exam.id}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{exam.name}</h2>
              <div className="mt-3 divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
                {list.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-muted">No subtests yet.</p>
                ) : (
                  list.map((s) => (
                    <div key={s.id} className="flex items-center justify-between px-4 py-3">
                      <span className="font-medium">{s.name}</span>
                      <form action={setSubtestFreeAction}>
                        <input type="hidden" name="subtestId" value={s.id} />
                        <input type="hidden" name="isFree" value={(!s.is_free).toString()} />
                        <button
                          type="submit"
                          className={
                            s.is_free
                              ? 'rounded-full bg-success-muted px-3 py-1 text-xs font-medium text-success transition-opacity hover:opacity-80'
                              : 'rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-muted transition-colors hover:text-foreground'
                          }
                          aria-label={s.is_free ? `Make ${s.name} gated` : `Make ${s.name} free`}
                        >
                          {s.is_free ? 'Free ✓' : 'Gated'}
                        </button>
                      </form>
                    </div>
                  ))
                )}
              </div>
            </section>
          )
        })}
      </div>
    </Container>
  )
}
