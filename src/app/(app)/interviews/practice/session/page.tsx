import { trialQuestionAllowed } from '@/lib/interviews/trial-catalog'
import { InterviewTrialNotice } from '@/components/interviews/trial-notice'
import { interviewAccess } from '@/lib/interviews/trial'
import { studentStation } from '@/lib/interviews/trial-stations'
import type { Metadata } from 'next'
import { InterviewRehearsalRunner } from '@/components/interviews/rehearsal-runner'
import { requireUser } from '@/lib/auth/dal'
import { getInterviewStation, type InterviewFormat } from '@/lib/interviews/stations'
import { getPracticeQuestionIndex } from '@/lib/interviews/timing'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Interview practice session' }

export default async function InterviewPracticeSessionPage({ searchParams }: { searchParams: Promise<{ format?: string; station?: string; question?: string; daily?: string }> }) {
  const user = await requireUser('/interviews/practice')
  const params = await searchParams
  const format: InterviewFormat = params.format === 'panel' ? 'panel' : 'mmi'
  const station = getInterviewStation(format, params.station)
  if (!station) redirect('/interviews/practice')
  const questionIndex = getPracticeQuestionIndex(station, params.question)
  if (questionIndex === null) redirect('/interviews/practice')
  const access=await interviewAccess(user.id)
  if(!['full','eligible','active'].includes(access.kind))return <InterviewTrialNotice access={access}/>
  if(access.kind!=='full'&&!trialQuestionAllowed(station.id,questionIndex))redirect('/interviews/practice')
  const safe=studentStation(access.kind==='full'?station:{...station,questions:station.format==='panel'?station.questions.slice(0,1):station.questions})
  return <InterviewRehearsalRunner allowUntracked={access.kind==='full'} daily={params.daily === '1'} key={`${station.id}:${questionIndex}:${params.daily === '1'}`} station={safe} questionIndex={questionIndex} userId={user.id} />
}
