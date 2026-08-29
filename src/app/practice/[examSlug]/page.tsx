import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Container } from '@/components/container'
import { requireUser } from '@/lib/auth/dal'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { canAccessExam } from '@/lib/access'
import { UpgradePrompt } from '@/components/ui/upgrade-prompt'
import { Builder } from './builder'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Build a session' }

export default async function BuilderPage({ params }: { params: Promise<{ examSlug: string }> }) {
  const user = await requireUser()
  const { examSlug } = await params
  const supabase = await createClient()
  const { data: exam } = await supabase.from('exams').select('id, name, slug').eq('slug', examSlug).maybeSingle()
  if (!exam) notFound()

  const admin = createAdminClient()
  const { data: subtests } = await admin.from('subtests').select('id, name').eq('exam_id', exam.id).order('sort_order')
  const subtestIds = (subtests ?? []).map((s) => s.id)
  const { data: qs } = await admin.from('questions').select('tags').eq('published', true).in('subtest_id', subtestIds)
  const tags = [...new Set((qs ?? []).flatMap((q) => q.tags ?? []))].sort()

  const entitled = await canAccessExam(user.id, exam.id)

  return (
    <Container className="py-12">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm text-muted"><Link href="/practice" className="hover:text-foreground">Practice</Link> / {exam.name}</p>
        <h1 className="mb-8 mt-2 text-3xl font-semibold tracking-tight">Build a {exam.name} session</h1>
        {entitled ? (
          <Builder examSlug={exam.slug} subtests={subtests ?? []} tags={tags} />
        ) : (
          <UpgradePrompt examName={exam.name} />
        )}
      </div>
    </Container>
  )
}
