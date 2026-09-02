import { notFound, redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/dal'
import { createClient } from '@/lib/supabase/server'
import { canAccessExam } from '@/lib/access'
import { isEssaySection } from '@/lib/essays/config'
import { getEssayPrompt, getEssayResponse } from '@/lib/essays/data'
import { EssayRunner } from '@/components/essay-runner'

export const dynamic = 'force-dynamic'

export default async function EssayWriterPage({
  params,
  searchParams,
}: {
  params: Promise<{ examSlug: string; subtestSlug: string; promptId: string }>
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const user = await requireUser()
  const { examSlug, subtestSlug, promptId } = await params
  if (!isEssaySection(examSlug, subtestSlug)) redirect(`/practice/${examSlug}/${subtestSlug}`)

  const supabase = await createClient()
  const { data: exam } = await supabase.from('exams').select('id, name, slug').eq('slug', examSlug).maybeSingle()
  if (!exam) notFound()
  if (!(await canAccessExam(user.id, exam.id))) redirect(`/practice/${exam.slug}`)

  const prompt = await getEssayPrompt(promptId)
  if (!prompt) notFound()

  // Optional resume/review of an existing essay (RLS scopes to the user's rows).
  const resumeId = (await searchParams).resume
  let resume = null
  if (resumeId) {
    const r = await getEssayResponse(resumeId)
    if (r && r.promptId === promptId) {
      resume = {
        id: r.id,
        body: r.body,
        timed: r.timed,
        durationMinutes: r.durationMinutes,
        timeSpentSeconds: r.timeSpentSeconds,
        status: r.status,
      }
    }
  }

  return (
    <EssayRunner
      label={`Section II: Written Communication`}
      examSlug={exam.slug}
      prompt={prompt}
      resume={resume}
    />
  )
}
