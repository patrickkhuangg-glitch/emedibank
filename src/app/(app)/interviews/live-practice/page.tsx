import type { Metadata } from 'next'
import { requireUser } from '@/lib/auth/dal'
import { interviewAccess } from '@/lib/interviews/trial'
import { InterviewTrialNotice } from '@/components/interviews/trial-notice'
import { INTERVIEW_STATIONS } from '@/lib/interviews/stations'
import { studentStation, trialStations } from '@/lib/interviews/trial-stations'
import { LivePracticeEntry } from '@/components/interviews/live-practice-entry'
import { listLivePracticeRooms } from '@/lib/interviews/live-practice-data'

export const metadata: Metadata = { title: 'Live Practice' }

export default async function LivePracticePage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const user = await requireUser('/interviews/live-practice'), access = await interviewAccess(user.id), params = await searchParams
  if (!['full', 'eligible', 'active'].includes(access.kind)) return <InterviewTrialNotice access={access} />
  const stations = access.kind === 'full' ? INTERVIEW_STATIONS.map(studentStation) : trialStations()
  const recent = await listLivePracticeRooms(user.id)
  return <LivePracticeEntry initialCode={params.code ?? ''} recent={recent} stations={stations.map(item => ({ id: item.id, format: item.format, title: item.title, category: item.category, preparation: item.format === 'panel' ? item.preparation : '', questions: item.questions }))} />
}
