import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth/dal'
import { createClient } from '@/lib/supabase/server'
import { resolveSessionQuestionIds } from '@/lib/questions/session'
import { resolveSetQuestionIds } from '@/lib/practice/sets'
import { resolveReviewQuestionIds } from '@/lib/dashboard/stats'
import { SessionRunner } from '@/components/session-runner'
import { GamsatRunner } from '@/components/gamsat-runner'

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

  // Set-based flow (from "Select timing"): mode=sets runs N question sets untimed;
  // mode=timed runs the whole category pool, time-boxed. Legacy flow (no mode)
  // keeps the old count-based resolution.
  const mode = sp.mode
  const subtestId = (sp.subtests ?? '').split(',').filter(Boolean)[0] ?? ''
  // A category tag can itself contain commas (e.g. "True, False, Can't Tell"), so the
  // `tags` param carries ONE category value verbatim — never split it on commas, or
  // such tags get truncated to "True" and match zero questions.
  const tag = (sp.tags ?? '').trim()
  const timed = mode === 'timed' || sp.timed === '1'

  const ids =
    mode === 'review'
      ? await resolveReviewQuestionIds(user.id, exam.id)
      : mode === 'sets' || mode === 'timed'
      ? // Both flows run whole sets; timed also carries a `sets` count sized to the
        // clock (2 min/set). Fall back to 0 = every set for older timed links.
        await resolveSetQuestionIds(
          user.id, exam.id, subtestId, tag,
          mode === 'sets' ? Number(sp.sets ?? 1) : Number(sp.sets ?? 0),
        )
      : await resolveSessionQuestionIds(user.id, exam.id, {
          subtestIds: (sp.subtests ?? '').split(',').filter(Boolean),
          tags: tag ? [tag] : [],
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

  const isGamsat = exam.slug === 'gamsat'

  // GAMSAT uses its own passage/stimulus interface (Sections I & III); everything
  // else uses the Pearson-VUE-style runner.
  let gamsatSubtestName = ''
  if (isGamsat && subtestId) {
    const { data: st } = await supabase.from('subtests').select('name').eq('id', subtestId).maybeSingle()
    gamsatSubtestName = st?.name ?? ''
  }

  const instructions = isGamsat
    ? `Practice Session — GAMSAT${gamsatSubtestName ? ` ${gamsatSubtestName}` : ''}

Each unit presents a passage, table or figure on the left and its questions on the right. Read the stimulus, then choose the best answer for each question.

Move between questions with the numbered tabs or the Next button, and bookmark any question to come back to it. Nothing is marked until you finish: select 'Finish' (or let the timer run out) to see your score, then open any question for the worked solution.

Select 'Begin' when you are ready.`
    : `${exam.name.toUpperCase()} PRACTICE QUESTIONS

This session runs in a full-screen interface that mirrors the real ${exam.name} test.

The 'Navigator' at the bottom right lets you move between questions, and you can flag any question for review.

Your answers are saved as you go. Nothing is marked until the end: select 'Finish' (or let the timer run out) to see your score, then select any question to review it with the answer explained.

Keyboard shortcuts: Alt+N next, Alt+P previous, Alt+F flag, Alt+C calculator, A-D to select an answer.

Please click the Next (N) button to proceed.`

  const Runner = isGamsat ? GamsatRunner : SessionRunner
  const label = isGamsat
    ? `Practice Session – GAMSAT${gamsatSubtestName ? ` ${gamsatSubtestName}` : ''}`
    : `${exam.name} · Practice`

  return (
    <Runner
      label={label}
      examSlug={exam.slug}
      instructions={instructions}
      questionIds={ids}
      timed={timed}
      minutes={Number(sp.minutes ?? 20)}
      subtestId={subtestId || null}
      tag={tag || null}
      mode={mode || 'sets'}
    />
  )
}
