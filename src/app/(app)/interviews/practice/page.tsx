import type { Metadata } from 'next'
import { InterviewPracticeWorkspace } from '@/components/interview-workspace-pages'
import { requireUser } from '@/lib/auth/dal'

export const metadata: Metadata = { title: 'Interview practice' }

export default async function InterviewPracticePage() {
  await requireUser('/interviews/practice')
  return <InterviewPracticeWorkspace />
}
