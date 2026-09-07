import type { Metadata } from 'next'
import { InterviewRehearsalRunner } from '@/components/interviews/rehearsal-runner'
import { requireUser } from '@/lib/auth/dal'
import { getInterviewStation, type InterviewFormat } from '@/lib/interviews/stations'
import { getPracticeQuestionIndex } from '@/lib/interviews/timing'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Interview practice session' }

export default async function InterviewPracticeSessionPage({ searchParams }: { searchParams: Promise<{ format?: string; station?: string; question?: string }> }) {
  await requireUser('/interviews/practice')
  const params = await searchParams
  const format: InterviewFormat = params.format === 'panel' ? 'panel' : 'mmi'
  const station = getInterviewStation(format, params.station)
  if (!station) redirect('/interviews/practice')
  const questionIndex = getPracticeQuestionIndex(station, params.question)
  if (questionIndex === null) redirect('/interviews/practice')
  return <InterviewRehearsalRunner key={`${station.id}:${questionIndex}`} station={station} questionIndex={questionIndex} />
}
