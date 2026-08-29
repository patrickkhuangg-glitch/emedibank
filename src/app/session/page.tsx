import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth/dal'
import { createClient } from '@/lib/supabase/server'
import { resolveSessionQuestionIds } from '@/lib/questions/session'
import { SessionRunner } from '@/components/session-runner'

export const dynamic = 'force-dynamic'

export default async function SessionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const user = await requireUser()
  const sp = await searchParams
  const supabase = await createClient()
  const { data: exam } = await supabase.from('exams').select('id, name, slug').eq('slug', sp.exam ?? '').maybeSingle()
  if (!exam) notFound()

  const ids = await resolveSessionQuestionIds(user.id, exam.id, {
    subtestIds: (sp.subtests ?? '').split(',').filter(Boolean),
    tags: (sp.tags ?? '').split(',').filter(Boolean),
    difficulty: sp.difficulty || null,
    count: Number(sp.count ?? 10),
  })

  if (ids.length === 0) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-[#eef1f4] p-6 text-center">
        <p className="text-lg font-semibold text-[#1b2a46]">No questions match those filters yet.</p>
        <Link href={`/practice/${exam.slug}`} className="rounded-lg bg-[#157d72] px-5 py-2.5 text-sm font-medium text-white">Back to builder</Link>
      </div>
    )
  }

  return (
    <SessionRunner
      label={`${exam.name} · Practice`}
      examSlug={exam.slug}
      questionIds={ids}
      timed={sp.timed === '1'}
      minutes={Number(sp.minutes ?? 20)}
    />
  )
}
