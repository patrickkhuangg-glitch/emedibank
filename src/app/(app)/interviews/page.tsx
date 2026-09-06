import type { Metadata } from 'next'
import { InterviewsDashboard } from '@/app/prototypes/interviews/page'
import { loadPracticeProgress } from '@/lib/interviews/practice-progress-data'
import { requireUser } from '@/lib/auth/dal'

export const metadata: Metadata = { title: 'Interviews dashboard' }

export default async function InterviewsPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const user = await requireUser('/interviews'), params = await searchParams
  const progress = await loadPracticeProgress(user.id, params.month)
  return <InterviewsDashboard embedded progress={progress} />
}
