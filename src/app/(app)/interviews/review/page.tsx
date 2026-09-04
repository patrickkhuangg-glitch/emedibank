import type { Metadata } from 'next'
import { InterviewAttemptReview } from '@/components/interview-attempt-review'
import { requireUser } from '@/lib/auth/dal'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Previous interview attempts',
}

export default async function InterviewReviewPage() {
  const user = await requireUser('/interviews/review')
  const supabase = await createClient()
  const { data: attempts } = await supabase
    .from('interview_attempts')
    .select('id, format, station_title, questions, duration_seconds, recording_path, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const reviewAttempts = await Promise.all((attempts ?? []).map(async (attempt) => {
    const { data: recording } = await supabase.storage
      .from('interview-recordings')
      .createSignedUrl(attempt.recording_path, 60 * 60)

    return {
      id: attempt.id,
      format: attempt.format,
      stationTitle: attempt.station_title,
      questions: attempt.questions,
      durationSeconds: attempt.duration_seconds,
      createdAt: attempt.created_at,
      audioUrl: recording?.signedUrl ?? null,
    }
  }))

  return <InterviewAttemptReview attempts={reviewAttempts} />
}
