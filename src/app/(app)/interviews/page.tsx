import type { Metadata } from 'next'
import { InterviewsDashboard } from '@/app/prototypes/interviews/page'
import { requireUser } from '@/lib/auth/dal'

export const metadata: Metadata = { title: 'Interviews dashboard' }

export default async function InterviewsPage() {
  await requireUser('/interviews')
  return <InterviewsDashboard embedded />
}
