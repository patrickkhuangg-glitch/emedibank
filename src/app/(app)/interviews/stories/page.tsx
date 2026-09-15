import {interviewAccess} from '@/lib/interviews/trial'
import {InterviewTrialNotice} from '@/components/interviews/trial-notice'
import type { Metadata } from 'next'
import { InterviewStoryBank } from '@/components/interviews/story-bank'
import { requireUser } from '@/lib/auth/dal'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Interview stories' }

export default async function InterviewStoriesPage() {
  const user = await requireUser('/interviews/stories')
  const db = await createClient()
  const { data, error } = await db.from('interview_stories').select('*').eq('user_id', user.id).order('updated_at', { ascending: false })
  // Included in the authenticated page prefetch; no second blank loading phase.
  const access=await interviewAccess(user.id)
  return <><InterviewTrialNotice access={access}/><InterviewStoryBank readOnly={!['full','active','eligible'].includes(access.kind)} key={user.id} userId={user.id} initialStories={error ? null : data ?? []} /></>
}
