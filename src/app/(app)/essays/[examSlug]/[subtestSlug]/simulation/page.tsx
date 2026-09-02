import { notFound, redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/dal'
import { createClient } from '@/lib/supabase/server'
import { canAccessExam } from '@/lib/access'
import { isEssaySection, SIMULATION_MINUTES } from '@/lib/essays/config'
import { getRandomPromptByTask, getEssayCredits, getSittingResponses, getEssayPrompt } from '@/lib/essays/data'
import { EssaySimulationRunner } from '@/components/essay-simulation-runner'

export const dynamic = 'force-dynamic'

// Full Section II simulation: a random Task A + a random Task B on a shared clock.
// With ?resume=<sittingId>, reload a paused sitting (both drafts) and continue.
export default async function EssaySimulationPage({
  params,
  searchParams,
}: {
  params: Promise<{ examSlug: string; subtestSlug: string }>
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const user = await requireUser()
  const { examSlug, subtestSlug } = await params
  if (!isEssaySection(examSlug, subtestSlug)) redirect(`/practice/${examSlug}/${subtestSlug}`)

  const supabase = await createClient()
  const { data: exam } = await supabase.from('exams').select('id, name, slug').eq('slug', examSlug).maybeSingle()
  if (!exam) notFound()
  if (!(await canAccessExam(user.id, exam.id))) redirect(`/practice/${exam.slug}`)

  const { data: subtest } = await supabase
    .from('subtests').select('id, slug').eq('exam_id', exam.id).eq('slug', subtestSlug).maybeSingle()
  if (!subtest) notFound()

  const credits = await getEssayCredits()
  const backHref = `/essays/${exam.slug}/${subtest.slug}`
  const resumeId = (await searchParams).resume

  // ── Resume a paused sitting ────────────────────────────────────────────────
  if (resumeId) {
    const rows = await getSittingResponses(resumeId)
    const resumable = rows.length === 2 && rows.every((r) => r.status === 'draft')
    if (!resumable) redirect(backHref)
    const prompts = await Promise.all(rows.map((r) => getEssayPrompt(r.promptId)))
    // Pair each response with its (still-published) prompt, ordered Task A then B.
    const paired = rows
      .map((r, i) => ({ r, p: prompts[i] }))
      .filter((x): x is { r: (typeof rows)[number]; p: NonNullable<(typeof prompts)[number]> } => x.p !== null)
      .sort((a, b) => (a.p.task > b.p.task ? 1 : -1))
    if (paired.length !== 2 || paired[0].p.task === paired[1].p.task) redirect(backHref)

    return (
      <EssaySimulationRunner
        label="Section II Simulation"
        examSlug={exam.slug}
        minutes={SIMULATION_MINUTES}
        taskA={paired[0].p}
        taskB={paired[1].p}
        credits={credits}
        resume={{
          ids: paired.map((x) => x.r.id),
          bodies: paired.map((x) => x.r.body),
          plans: paired.map((x) => x.r.plan ?? ''),
          elapsedSeconds: Math.max(...paired.map((x) => x.r.timeSpentSeconds)),
        }}
      />
    )
  }

  // ── Fresh sitting ──────────────────────────────────────────────────────────
  const [taskA, taskB] = await Promise.all([
    getRandomPromptByTask(subtest.id, 'A'),
    getRandomPromptByTask(subtest.id, 'B'),
  ])
  if (!taskA || !taskB) redirect(backHref)

  return (
    <EssaySimulationRunner
      label="Section II Simulation"
      examSlug={exam.slug}
      minutes={SIMULATION_MINUTES}
      taskA={taskA}
      taskB={taskB}
      credits={credits}
    />
  )
}
