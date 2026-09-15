import { requireInterviewPractice } from '@/lib/interviews/trial'
import { INTERVIEW_STATIONS } from '@/lib/interviews/stations'
import { getPracticeQuestionIndex } from '@/lib/interviews/timing'
import { getUser } from '@/lib/auth/dal'
import { createAdminClient } from '@/lib/supabase/admin'
import { apiError, InterviewApiError, readSmallJson } from '@/lib/interviews/api'
import { stationSnapshot, mediaExtension, baseMime } from '@/lib/interviews/video-validation'
import { practiceDay } from '@/lib/interviews/practice-progress'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export async function POST(request: Request) {
  try {
    const user = await getUser()
    if (!user) throw new InterviewApiError('Sign in required.', 401)
    if (request.headers.get('origin') !== new URL(request.url).origin) throw new InterviewApiError('Request origin is not allowed.', 403)
    const body = await readSmallJson(request)
    if (typeof body.id !== 'string' || !uuid.test(body.id)) throw new InterviewApiError('Invalid recording. Please start a new practice session.')
    const type = String(body.audioType ?? ''), extension = mediaExtension(type, 'audio')
    const station = INTERVIEW_STATIONS.find(s => s.format === body.format && s.id === body.stationId)
    if (!station) throw new InterviewApiError('Choose an available practice station.')
    const questionIndex = getPracticeQuestionIndex(station, body.questionIndex)
    if (questionIndex === null) throw new InterviewApiError('Choose an available panel question.')
    await requireInterviewPractice(user,station.id,questionIndex,true)
    const db = createAdminClient()
    const dailyMode = body.daily === true
    if (dailyMode) {
      const { data: assigned } = await db.from('interview_daily_stations').select('id').eq('user_id', user.id).eq('local_day', practiceDay(new Date())).eq('station_id', station.id).maybeSingle()
      if (!assigned) throw new InterviewApiError('Today’s Daily Station has changed. Return to the dashboard and open it again.', 409)
    }
    const snapshot = { ...stationSnapshot(body.format, body.stationId, questionIndex, dailyMode ? 'daily' : 'standard'), source: 'practice_audio', progression_context: dailyMode ? 'daily' : 'standard' }
    // The browser retains one ID for retries, including a lost initiation response.
    const { data: existing, error: lookupError } = await db.from('interview_attempts').select('id,user_id,media_kind,station_id,recording_mime_type,recording_path,upload_status,station_snapshot').eq('id', body.id).maybeSingle()
    if (lookupError) throw lookupError
    if (existing) {
      const savedSnapshot = existing.station_snapshot as { question_index?: number; progression_context?: string } | null
      if (existing.user_id !== user.id || existing.media_kind !== 'audio' || existing.station_id !== snapshot.station_id || existing.recording_mime_type !== baseMime(type) || (savedSnapshot?.question_index ?? 0) !== questionIndex || (savedSnapshot?.progression_context ?? 'standard') !== snapshot.progression_context || !['awaiting_upload', 'uploading', 'ready'].includes(existing.upload_status)) throw new InterviewApiError('This recording cannot be resumed.', 409)
      return Response.json({ attemptId: existing.id, audioPath: existing.recording_path }, { headers: { 'Cache-Control': 'no-store' } })
    }
    const path = `${user.id}/${body.id}/practice.${extension}`
    const { error } = await db.from('interview_attempts').insert({ id: body.id, user_id: user.id, format: snapshot.format, station_id: snapshot.station_id, station_title: snapshot.title, questions: snapshot.questions, recording_path: path, recording_mime_type: baseMime(type), media_kind: 'audio', upload_status: 'awaiting_upload', station_snapshot: snapshot })
    if (error?.code === '23505') throw new InterviewApiError('This recording is being prepared. Retry saving.', 409)
    if (error?.message.includes('recording_daily_limit')) throw new InterviewApiError('You have reached the daily recording limit. Download your audio and keep this tab open to retry later.', 429)
    if (error?.message.includes('recording_storage_limit')) throw new InterviewApiError('Your recording storage is full. Download this audio before deleting older recordings and retrying.', 429)
    if (error) throw error
    return Response.json({ attemptId: body.id, audioPath: path }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return apiError(error) }
}
