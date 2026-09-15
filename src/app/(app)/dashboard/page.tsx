import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { PageContainer as Container } from '@/components/container'
import { requireStudent } from '@/lib/auth/dal'
import { getCurrentExam, listExams } from '@/lib/exam/current'
import { getDashboard, mostRecentExamId } from '@/lib/dashboard/stats'
import { getSectionAccess } from '@/lib/access'
import { StudyDashboard } from '@/components/workspace/study-dashboard'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Dashboard' }


export default async function DashboardPage() {
  const profile = await requireStudent('/dashboard')
  const first = profile?.full_name?.split(' ')[0] ?? 'there'
  // Prefer the pinned exam; otherwise the one they've practised most recently.
  let exam = await getCurrentExam()
  if (exam?.kind === 'interview') redirect('/interviews')
  if (!exam) {
    const exams = (await listExams()).filter((candidate) => candidate.kind === 'mcq')
    const recent = await mostRecentExamId(profile.id)
    exam = exams.find((e) => e.id === recent) ?? exams[0]
  }

  if (!exam) {
    return (
      <Container>
        <h1 className="page-title">Hi {first} 👋</h1>
        <p className="mt-2 text-muted">No exams are set up yet.</p>
      </Container>
    )
  }

  const [d, sectionAccess] = await Promise.all([
    getDashboard(profile.id, exam.slug, exam.id),
    getSectionAccess(profile.id, exam.id),
  ])
  return <StudyDashboard first={first} exam={exam} data={d} access={sectionAccess} />
}
