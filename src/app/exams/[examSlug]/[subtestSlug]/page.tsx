import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Container } from '@/components/container'
import { requireUser } from '@/lib/auth/dal'
import { createClient } from '@/lib/supabase/server'
import { canAccessSubtest } from '@/lib/access'
import { UpgradePrompt } from '@/components/ui/upgrade-prompt'

export const dynamic = 'force-dynamic'

export default async function SubtestPage({
  params,
}: {
  params: Promise<{ examSlug: string; subtestSlug: string }>
}) {
  const user = await requireUser()
  const { examSlug, subtestSlug } = await params
  const supabase = await createClient()

  const { data: exam } = await supabase
    .from('exams')
    .select('id, name, slug')
    .eq('slug', examSlug)
    .maybeSingle()
  if (!exam) notFound()

  const { data: subtest } = await supabase
    .from('subtests')
    .select('*')
    .eq('exam_id', exam.id)
    .eq('slug', subtestSlug)
    .maybeSingle()
  if (!subtest) notFound()

  // Authoritative gate — never trust the client.
  const allowed = await canAccessSubtest(user.id, subtest.id)

  return (
    <Container className="py-16">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm text-muted">
          <Link href="/exams" className="hover:text-foreground">Exams</Link> /{' '}
          <Link href={`/exams/${exam.slug}`} className="hover:text-foreground">{exam.name}</Link> /{' '}
          {subtest.name}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{subtest.name}</h1>

        <div className="mt-8">
          {allowed ? (
            <div className="rounded-2xl border border-border bg-surface p-8 text-center">
              <span className="inline-block rounded-full bg-success-muted px-3 py-1 text-xs font-medium text-success">
                {subtest.is_free ? 'Free subtest' : 'Unlocked'}
              </span>
              <p className="mt-4 text-muted">
                Content for this subtest will appear here in a later phase (question bank,
                mocks, lessons). Access control is working — you can reach it.
              </p>
            </div>
          ) : (
            <UpgradePrompt examName={exam.name} />
          )}
        </div>
      </div>
    </Container>
  )
}
