import { TRIAL_MMI_IDS, TRIAL_PANEL_IDS } from '@/lib/interviews/trial-catalog'
import { suggestPractice } from '@/lib/interviews/practice-progress'
import { interviewAccess } from '@/lib/interviews/trial'
import { InterviewTrialNotice } from '@/components/interviews/trial-notice'
import type { Metadata } from 'next'
import { InterviewsDashboard } from '@/app/prototypes/interviews/page'
import { loadPracticeProgress } from '@/lib/interviews/practice-progress-data'
import { loadFeedbackToRead } from '@/lib/interviews/continue-practice-data'
import { loadInterviewProgression } from '@/lib/interviews/progression-data'
import { getProfile, requireUser } from '@/lib/auth/dal'

export const metadata: Metadata = { title: 'Interviews dashboard' }

export default async function InterviewsPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const user = await requireUser('/interviews'), params = await searchParams
  const [progress, feedback, access, profile] = await Promise.all([loadPracticeProgress(user.id, params.month), loadFeedbackToRead(user.id), interviewAccess(user.id), getProfile()])
  const allowed = access.kind === 'full' ? undefined : [...TRIAL_MMI_IDS, ...TRIAL_PANEL_IDS]
  if (allowed) progress.suggestions = suggestPractice(progress.logs, progress.today, allowed)
  const progression = await loadInterviewProgression(user.id, progress.logs, progress.today, allowed)
  return <><InterviewTrialNotice access={access}/><InterviewsDashboard key={user.id} embedded progress={progress} progression={progression} userId={user.id} studentName={profile?.full_name ?? undefined} feedback={feedback} /></>
}
