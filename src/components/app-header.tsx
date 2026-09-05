import Link from 'next/link'
import { Container } from './container'
import { getUser, getProfile } from '@/lib/auth/dal'
import { homeForRole } from '@/lib/auth/roles'
import { getCurrentExam, listExams } from '@/lib/exam/current'
import { SiteNav } from './site-nav'
import { ExamSwitcher } from './exam-switcher'
import { Wordmark } from './ui/wordmark'

/** LMS chrome: exam switcher (top-left) + the scoped pill nav. */
export async function AppHeader() {
  const user = await getUser()
  const profile = user ? await getProfile() : null
  const role = profile?.role ?? 'student'
  const [current, exams] = role === 'student'
    ? await Promise.all([getCurrentExam(), listExams()])
    : [null, []]

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/85 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-3">
        {role === 'student' ? (
          <ExamSwitcher current={current} exams={exams} variant={profile?.interface_mode ?? 'playful'} />
        ) : (
          <Link href={homeForRole(role)} aria-label={`${role === 'admin' ? 'Admin' : 'Tutor'} workspace home`} className="eb-press flex min-w-0 items-center gap-3 rounded-full">
            <Wordmark markSize={30} variant={profile?.interface_mode ?? 'playful'} endorsement={false} className="shrink-0 text-lg" />
            <span className="hidden rounded-full bg-brand-muted px-2.5 py-1 font-mono text-xs font-semibold uppercase tracking-[0.12em] text-brand sm:inline">{role} workspace</span>
          </Link>
        )}
        <SiteNav role={role} currentExamSlug={current?.slug ?? null} />
      </Container>
    </header>
  )
}
