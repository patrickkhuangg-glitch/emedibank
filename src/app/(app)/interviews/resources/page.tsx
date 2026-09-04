import type { Metadata } from 'next'
import { InterviewResourcesWorkspace } from '@/components/interview-workspace-pages'
import { requireUser } from '@/lib/auth/dal'

export const metadata: Metadata = { title: 'Interview resources' }

export default async function InterviewResourcesPage() {
  await requireUser('/interviews/resources')
  return <InterviewResourcesWorkspace />
}
