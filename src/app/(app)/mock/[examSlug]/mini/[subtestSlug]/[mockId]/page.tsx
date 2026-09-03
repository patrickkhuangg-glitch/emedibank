import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { MockRunner } from '@/components/mock-runner'
import { requireUser } from '@/lib/auth/dal'
import { canAccessExam } from '@/lib/access'
import { findMiniMock } from '@/lib/mock/config'
import { resolveMockSections } from '@/lib/mock/resolve'
import { signManifest } from '@/lib/mock/token'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function MiniMockRunPage({ params }: { params: Promise<{ examSlug: string; subtestSlug: string; mockId: string }> }) {
  const user = await requireUser()
  const { examSlug, subtestSlug, mockId } = await params
  const mock = findMiniMock(examSlug, subtestSlug, mockId)
  if (!mock) notFound()
  const supabase = await createClient()
  const { data: exam } = await supabase.from('exams').select('id, name, slug').eq('slug', examSlug).maybeSingle()
  if (!exam) notFound()
  if (!(await canAccessExam(user.id, exam.id))) redirect('/pricing')
  const resolved = await resolveMockSections(exam.id, mock)
  const expected = mock.sections[0].count
  if (resolved.length !== 1 || resolved[0].questionIds.length < expected) return <ComingSoon href={`/mock/${examSlug}/mini/${subtestSlug}`} />
  const token = signManifest({ u: user.id, e: exam.id, q: resolved[0].questionIds })
  return <MockRunner kind="mini" label={`${exam.name} · ${mock.name}`} examSlug={exam.slug} token={token} sections={resolved.map((s) => ({ name: s.name, minutes: s.minutes, questionIds: s.questionIds }))} />
}

function ComingSoon({ href }: { href: string }) { return <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-[#eef1f4] p-6 text-center"><p className="text-lg font-semibold text-[#1b2a46]">This mini mock is not ready yet.</p><p className="max-w-sm text-sm text-gray-600">Its fixed question form will appear here once the questions are assigned.</p><Link href={href} className="rounded-lg bg-[#157d72] px-5 py-2.5 text-sm font-medium text-white">Back to mini mocks</Link></div> }
