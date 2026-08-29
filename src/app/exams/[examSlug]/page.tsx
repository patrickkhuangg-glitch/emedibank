import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Container } from '@/components/container'
import { requireUser } from '@/lib/auth/dal'
import { createClient } from '@/lib/supabase/server'
import { hasActiveEntitlement } from '@/lib/access'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ examSlug: string }>
}): Promise<Metadata> {
  const { examSlug } = await params
  return { title: examSlug.toUpperCase() }
}

export default async function ExamPage({
  params,
}: {
  params: Promise<{ examSlug: string }>
}) {
  const user = await requireUser()
  const { examSlug } = await params
  const supabase = await createClient()

  const { data: exam } = await supabase
    .from('exams')
    .select('*')
    .eq('slug', examSlug)
    .maybeSingle()
  if (!exam) notFound()

  const { data: subtests } = await supabase
    .from('subtests')
    .select('*')
    .eq('exam_id', exam.id)
    .order('sort_order')

  const entitled = await hasActiveEntitlement(user.id, exam.id)

  return (
    <Container className="py-16">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm text-muted">
          <Link href="/exams" className="hover:text-foreground">Exams</Link> / {exam.name}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{exam.name}</h1>

        <div className="mt-8 divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
          {(subtests ?? []).length === 0 ? (
            <p className="px-4 py-4 text-sm text-muted">No subtests yet for this exam.</p>
          ) : (
            (subtests ?? []).map((s) => {
              const unlocked = s.is_free || entitled
              return (
                <Link
                  key={s.id}
                  href={`/exams/${exam.slug}/${s.slug}`}
                  className="flex items-center justify-between px-4 py-4 transition-colors hover:bg-surface-muted"
                >
                  <span className="font-medium">{s.name}</span>
                  {unlocked ? (
                    <span className="rounded-full bg-success-muted px-3 py-1 text-xs font-medium text-success">
                      {s.is_free ? 'Free' : 'Unlocked'}
                    </span>
                  ) : (
                    <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-muted">
                      Locked
                    </span>
                  )}
                </Link>
              )
            })
          )}
        </div>
      </div>
    </Container>
  )
}
