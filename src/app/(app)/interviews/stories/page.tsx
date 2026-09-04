import type { Metadata } from 'next'
import { InterviewStoriesWorkspace } from '@/components/interview-workspace-pages'
import { requireUser } from '@/lib/auth/dal'

export const metadata: Metadata = { title: 'Interview stories' }

export default async function InterviewStoriesPage() {
  await requireUser('/interviews/stories')
  return <InterviewStoriesWorkspace />
}
