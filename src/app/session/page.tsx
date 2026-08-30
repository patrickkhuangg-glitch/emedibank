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
        <Link href={`/practice/${exam.slug}`} className="rounded-lg bg-[#157d72] px-5 py-2.5 text-sm font-medium text-white">Back to practice</Link>
      </div>
    )
  }

  const instructions = `${exam.name.toUpperCase()} PRACTICE QUESTIONS

This session runs in a full-screen interface that mirrors the real ${exam.name} test.

The 'Navigator' at the bottom right lets you move between questions. As you work through each question, click 'Explain Answer' at the top left to check the correct answer and read the rationale.

You can review your answers on the Review Screen at the end — click any question to return to it.

Keyboard shortcuts: Alt+N next, Alt+P previous, Alt+F flag, Alt+C calculator, A–D to select an answer.

Please click the Next (N) button to proceed.`

  return (
    <SessionRunner
      label={`${exam.name} · Practice`}
      examSlug={exam.slug}
      instructions={instructions}
      questionIds={ids}
      timed={sp.timed === '1'}
      minutes={Number(sp.minutes ?? 20)}
    />
  )
}
