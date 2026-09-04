import type { Metadata } from 'next'
import { InterviewPreview } from '@/app/prototypes/interviews/page'
import { requireUser } from '@/lib/auth/dal'

export const metadata: Metadata = { title: 'Interviews' }

export default async function InterviewsPage() {
  await requireUser('/interviews')
  return <InterviewPreview embedded />
}
