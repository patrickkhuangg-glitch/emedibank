import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { AppHeader } from '@/components/app-header'
import { requireCompletedProfile } from '@/lib/auth/dal'
import { getCurrentExam, listExams } from '@/lib/exam/current'
import { ExamSwitcher } from '@/components/exam-switcher'
import { SiteNav } from '@/components/site-nav'
import { WorkspaceFrame } from '@/components/workspace/workspace-frame'
import { requireAdminMfa } from '@/lib/auth/admin-mfa'

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { profile } = await requireCompletedProfile()
  if (profile?.role === 'admin') await requireAdminMfa()
  if (profile?.role === 'student') {
    const [current, exams] = await Promise.all([getCurrentExam(), listExams()])
    return <WorkspaceFrame name={profile.full_name?.split(' ')[0] || 'Student'} examKey={current?.slug}
      originalHeader={<AppHeader />}
      examSwitcher={<ExamSwitcher compact current={current} exams={exams} variant={profile.interface_mode ?? 'playful'} />}
      navigation={<SiteNav workspace role="student" currentExamSlug={current?.slug ?? null} />}>
      {children}
    </WorkspaceFrame>
  }
  return (
    <>
      <AppHeader />
      <main className="flex-1">{children}</main>
    </>
  )
}
