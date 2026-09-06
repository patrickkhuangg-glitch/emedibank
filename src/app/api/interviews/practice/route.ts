import { getUser } from '@/lib/auth/dal'
import { createAdminClient } from '@/lib/supabase/admin'
import { INTERVIEW_STATIONS } from '@/lib/interviews/stations'
import { apiError, InterviewApiError, readSmallJson } from '@/lib/interviews/api'
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export async function POST(request: Request) {
  try {
    const user = await getUser()
    if (!user) throw new InterviewApiError('Sign in required.', 401)
    if (request.headers.get('origin') !== new URL(request.url).origin) throw new InterviewApiError('Request origin is not allowed.', 403)
    const body = await readSmallJson(request)
    const station = INTERVIEW_STATIONS.find(station => station.id === body.stationId)
    if (!station || typeof body.id !== 'string' || !uuid.test(body.id)) throw new InterviewApiError('Choose an available practice question.')
    const db = createAdminClient()
    const { error } = await db.from('interview_practice_logs').upsert({ id: body.id, user_id: user.id, station_id: station.id, format: station.format, source: 'rehearsal' }, { onConflict: 'id', ignoreDuplicates: true })
    if (error) throw new InterviewApiError('Practice tracking could not start. Please try again.', 503)
    const { data } = await db.from('interview_practice_logs').select('id,station_id,source,completed_at').eq('id', body.id).eq('user_id', user.id).maybeSingle()
    if (!data || data.station_id !== station.id || data.source !== 'rehearsal') throw new InterviewApiError('This practice session is not available.', 409)
    return Response.json({ id: data.id, completed: !!data.completed_at }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return apiError(error) }
}
