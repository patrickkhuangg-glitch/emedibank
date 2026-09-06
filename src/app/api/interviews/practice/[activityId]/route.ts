import { getUser } from '@/lib/auth/dal'
import { createAdminClient } from '@/lib/supabase/admin'
import { apiError, InterviewApiError, readSmallJson } from '@/lib/interviews/api'
import { getInterviewTiming } from '@/lib/interviews/timing'
export async function PATCH(request: Request, { params }: { params: Promise<{ activityId: string }> }) {
  try {
    const user = await getUser()
    if (!user) throw new InterviewApiError('Sign in required.', 401)
    if (request.headers.get('origin') !== new URL(request.url).origin) throw new InterviewApiError('Request origin is not allowed.', 403)
    const { activityId } = await params
    if (!/^[0-9a-f-]{36}$/i.test(activityId)) throw new InterviewApiError('Practice not found.', 404)
    const body = await readSmallJson(request), db = createAdminClient()
    const { data: log, error } = await db.from('interview_practice_logs').select('*').eq('id', activityId).eq('user_id', user.id).maybeSingle()
    if (error) throw new InterviewApiError('Practice history is unavailable. Please try again.', 503)
    if (!log) throw new InterviewApiError('Practice not found.', 404)
    if (body.action === 'complete') {
      if (log.source !== 'rehearsal') throw new InterviewApiError('Recordings are logged when saving finishes.')
      if (!log.completed_at) {
        const availableSeconds = Math.floor((Date.now() - Date.parse(log.started_at)) / 1000) - getInterviewTiming(log.format).preparationSeconds
        if (typeof body.durationSeconds !== 'number' || !Number.isInteger(body.durationSeconds) || body.durationSeconds < 1 || body.durationSeconds > getInterviewTiming(log.format).responseSeconds || availableSeconds < 1 || body.durationSeconds > availableSeconds + 2) throw new InterviewApiError('Complete some spoken practice before saving it to your calendar.')
        const { error: saveError } = await db.from('interview_practice_logs').update({ completed_at: new Date().toISOString(), duration_seconds: body.durationSeconds }).eq('id', activityId).eq('user_id', user.id).is('completed_at', null)
        if (saveError) throw new InterviewApiError('Your practice could not be saved. Try again.', 503)
      }
    } else if (body.action === 'rate') {
      if (!log.completed_at) throw new InterviewApiError('Finish practice before rating it.')
      if (body.rating !== null && (typeof body.rating !== 'number' || !Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5)) throw new InterviewApiError('Choose a rating from 1 to 5.')
      const { error: saveError } = await db.from('interview_practice_logs').update({ self_rating: body.rating as number | null }).eq('id', activityId).eq('user_id', user.id)
      if (saveError) throw new InterviewApiError('Your rating could not be saved. Try again.', 503)
    } else throw new InterviewApiError('Choose a valid practice action.')
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return apiError(error) }
}
