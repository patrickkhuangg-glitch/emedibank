import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/dal'
import { createClient } from '@/lib/supabase/server'
import { canAccessExam } from '@/lib/access'
import { findMock } from '@/lib/mock/config'
import { resolveMockSections } from '@/lib/mock/resolve'
import { signManifest } from '@/lib/mock/token'
import { MockRunner } from '@/components/mock-runner'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ examSlug: string; mockId: string }>
}): Promise<Metadata> {
  const { examSlug, mockId } = await params
  return { title: `${examSlug.toUpperCase()} ${mockId}` }
}

export default async function MockRunPage({
  params,
}: {
  params: Promise<{ examSlug: string; mockId: string }>
}) {
  const user = await requireUser()
  const { examSlug, mockId } = await params
  const supabase = await createClient()
  const { data: exam } = await supabase.from('exams').select('id, name, slug').eq('slug', examSlug).maybeSingle()
  if (!exam) notFound()

  const mock = findMock(examSlug, mockId)
  if (!mock) notFound()

  // Free mocks are open to any signed-in user; premium mocks need entitlement.
  if (!mock.free && !(await canAccessExam(user.id, exam.id))) redirect(`/mock/${exam.slug}`)

  const resolved = await resolveMockSections(exam.id, mock)
  if (resolved.length === 0) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-[#eef1f4] p-6 text-center">
        <p className="text-lg font-semibold text-[#1b2a46]">This mock has no questions yet.</p>
        <p className="max-w-sm text-sm text-gray-600">Mocks fill up as the question bank grows. Check back soon.</p>
        <Link href={`/mock/${exam.slug}`} className="rounded-lg bg-[#157d72] px-5 py-2.5 text-sm font-medium text-white">Back to mock exams</Link>
      </div>
    )
  }

  const allIds = resolved.flatMap((s) => s.questionIds)
  const token = signManifest({ u: user.id, e: exam.id, q: allIds })

  return (
    <MockRunner
      label={`${exam.name} ${mock.name}`}
      examSlug={exam.slug}
      token={token}
      sections={resolved.map((s) => ({ name: s.name, minutes: s.minutes, questionIds: s.questionIds }))}
    />
  )
}
