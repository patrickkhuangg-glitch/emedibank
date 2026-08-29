import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Container } from '@/components/container'
import { requireUser } from '@/lib/auth/dal'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { canAccessExam } from '@/lib/access'
import { UpgradePrompt } from '@/components/ui/upgrade-prompt'
import { Runner } from './runner'

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
    .select('id, name')
    .eq('exam_id', exam.id)
    .eq('slug', subtestSlug)
    .maybeSingle()
  if (!subtest) notFound()

  // Published question ids for this subtest (admin client — questions aren't public).
  const admin = createAdminClient()
  const { data: questions } = await admin
    .from('questions')
    .select('id')
    .eq('subtest_id', subtest.id)
    .eq('published', true)
    .order('sort_order')
  const questionIds = (questions ?? []).map((q) => q.id)

  const entitled = await canAccessExam(user.id, exam.id)

  return (
    <Container className="py-12">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm text-muted">
          <Link href="/exams" className="hover:text-foreground">Exams</Link> /{' '}
          <Link href={`/exams/${exam.slug}`} className="hover:text-foreground">{exam.name}</Link> /{' '}
          {subtest.name}
        </p>
        <h1 className="mb-6 mt-2 text-3xl font-semibold tracking-tight">{subtest.name}</h1>

        {questionIds.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-8 text-center text-muted">
            No questions here yet — they&rsquo;re on the way.
          </div>
        ) : entitled ? (
          <Runner subtestName={subtest.name} questionIds={questionIds} />
        ) : (
          <div>
            <p className="mb-4 text-sm text-muted">
              {questionIds.length} question{questionIds.length === 1 ? '' : 's'} in this subtest.
            </p>
            <UpgradePrompt examName={exam.name} />
          </div>
        )}
      </div>
    </Container>
  )
}
