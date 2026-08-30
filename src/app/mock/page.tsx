import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/container'
import { requireUser } from '@/lib/auth/dal'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Mock exams' }

export default async function MockIndexPage() {
  await requireUser('/mock')
  const supabase = await createClient()
  const { data: exams } = await supabase.from('exams').select('*').eq('active', true).eq('kind', 'mcq').order('created_at')
  return (
    <Container className="py-16">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight">Mock exams</h1>
        <p className="mt-1 text-muted">Sit a full, timed exam under test-day conditions.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {(exams ?? []).map((exam, idx) => (
            <Link
              key={exam.id}
              href={`/mock/${exam.slug}`}
              className="eb-rise group rounded-xl border border-border bg-surface p-6 transition-colors hover:bg-surface-muted"
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <h2 className="font-semibold">{exam.name}</h2>
              <p className="mt-1 text-sm text-muted">Full timed {exam.name} papers</p>
            </Link>
          ))}
        </div>
      </div>
    </Container>
  )
}
