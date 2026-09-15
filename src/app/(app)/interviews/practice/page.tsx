import { InterviewTrialNotice } from '@/components/interviews/trial-notice'
import { interviewAccess } from '@/lib/interviews/trial'
import { trialStations, studentStation } from '@/lib/interviews/trial-stations'
import { INTERVIEW_STATIONS } from '@/lib/interviews/stations'
import type { Metadata } from 'next'
import { InterviewPracticeLobby } from '@/components/interview-practice-lobby'
import { requireUser } from '@/lib/auth/dal'

export const metadata: Metadata = { title: 'Interview practice' }

export default async function InterviewPracticePage() {
  const user=await requireUser('/interviews/practice')
  const access=await interviewAccess(user.id)
  return <><InterviewTrialNotice access={access}/>{['full','eligible','active'].includes(access.kind)&&<InterviewPracticeLobby stations={access.kind==='full'?INTERVIEW_STATIONS.map(studentStation):trialStations()} />}</>
}
