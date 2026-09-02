import { notFound, redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/dal'
import { createClient } from '@/lib/supabase/server'
import { canAccessExam } from '@/lib/access'
import { isEssaySection } from '@/lib/essays/config'
import { getRandomPromptByTask, getEssayCredits } from '@/lib/essays/data'
import { EssayRunner } from '@/components/essay-runner'

export const dynamic = 'force-dynamic'

// Concealed-topic sitting: the student commits to a task and gets a random
// published prompt, its theme hidden until they begin.
export default async function RandomEssayPage({
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

  const task = ((await searchParams).task ?? 'A').toUpperCase() === 'B' ? 'B' : 'A'
  const prompt = await getRandomPromptByTask(subtest.id, task)
  // No prompts of that task yet — send them back to choose.
  if (!prompt) redirect(`/essays/${exam.slug}/${subtest.slug}`)

  const credits = await getEssayCredits()

  return (
    <EssayRunner
      label="Section II: Written Communication"
      examSlug={exam.slug}
      prompt={prompt}
      credits={credits}
      concealTopic
    />
  )
}
