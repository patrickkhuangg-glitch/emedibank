import { Container } from './container'
import { getUser, getProfile } from '@/lib/auth/dal'
import { getCurrentExam, listExams } from '@/lib/exam/current'
import { SiteNav } from './site-nav'
import { ExamSwitcher } from './exam-switcher'

/** LMS chrome: exam switcher (top-left) + the scoped pill nav. */
export async function AppHeader() {
  const user = await getUser()
  const profile = user ? await getProfile() : null
  const [current, exams] = await Promise.all([getCurrentExam(), listExams()])

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/85 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-3">
        <ExamSwitcher current={current} exams={exams} />
        <SiteNav isAdmin={profile?.role === 'admin'} currentExamSlug={current?.slug ?? null} />
      </Container>
    </header>
  )
}
