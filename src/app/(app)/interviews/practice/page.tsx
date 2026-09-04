import type { Metadata } from 'next'
import { InterviewPracticeLobby } from '@/components/interview-practice-lobby'
import { requireUser } from '@/lib/auth/dal'

export const metadata: Metadata = { title: 'Interview practice' }

export default async function InterviewPracticePage() {
  await requireUser('/interviews/practice')
  return <InterviewPracticeLobby />
}
