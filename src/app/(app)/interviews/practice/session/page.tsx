import type { Metadata } from 'next'
import { InterviewPracticeRunner } from '@/components/interview-practice-runner'
import { requireUser } from '@/lib/auth/dal'
import { getInterviewStation, type InterviewFormat } from '@/lib/interviews/stations'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Interview practice session' }

export default async function InterviewPracticeSessionPage({ searchParams }: { searchParams: Promise<{ format?: string; station?: string }> }) {
  await requireUser('/interviews/practice')
  const params = await searchParams
  const format: InterviewFormat = params.format === 'panel' ? 'panel' : 'mmi'
  const station = getInterviewStation(format, params.station)
  if (!station) redirect('/interviews/practice')
  return <InterviewPracticeRunner station={station} />
}
