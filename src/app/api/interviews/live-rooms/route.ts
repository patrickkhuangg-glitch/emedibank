import { getProfile, getUser } from '@/lib/auth/dal'
import { createAdminClient } from '@/lib/supabase/admin'
import { apiError, InterviewApiError, readSmallJson } from '@/lib/interviews/api'
import { INTERVIEW_STATIONS } from '@/lib/interviews/stations'
import { getPracticeQuestionIndex } from '@/lib/interviews/timing'
import { requireInterviewPractice } from '@/lib/interviews/trial'
import { createInviteCode, hashInviteCode, normaliseInviteCode } from '@/lib/interviews/live-practice'

export async function POST(request: Request) {
  try {
    const user = await getUser()
    if (!user) throw new InterviewApiError('Sign in required.', 401)
    if (request.headers.get('origin') !== new URL(request.url).origin) throw new InterviewApiError('Request origin is not allowed.', 403)
    const body = await readSmallJson(request)
    if (body.action === 'create') return createRoom(user, body)
    if (body.action === 'join') return joinRoom(user, body)
    throw new InterviewApiError('Choose whether to create or join a room.')
  } catch (error) { return apiError(error) }
}

async function createRoom(user: NonNullable<Awaited<ReturnType<typeof getUser>>>, body: Record<string, unknown>) {
  const station = INTERVIEW_STATIONS.find(item => item.id === body.stationId)
  if (!station) throw new InterviewApiError('Choose an available interview station.')
  const questionIndex = getPracticeQuestionIndex(station, body.questionIndex)
  if (questionIndex === null) throw new InterviewApiError('Choose an available panel question.')
  await requireInterviewPractice(user, station.id, questionIndex, true)
  const profile = await getProfile(), db = createAdminClient()
  const { count } = await db.from('interview_live_rooms').select('id', { count: 'exact', head: true }).eq('host_id', user.id).gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
  if ((count ?? 0) >= 8) throw new InterviewApiError('You have created several rooms recently. Reuse an open room or wait a little before creating another.', 429)

  for (let attempt = 0; attempt < 5; attempt++) {
    const inviteCode = createInviteCode(), inviteHash = await hashInviteCode(inviteCode)
    const { data: room, error } = await db.from('interview_live_rooms').insert({
      invite_code_hash: inviteHash,
      host_id: user.id,
      candidate_id: user.id,
      station_id: station.id,
      format: station.format,
      question_index: questionIndex,
      recording_enabled: body.recordingEnabled === true,
    }).select('*').single()
    if (error?.code === '23505') continue
    if (error || !room) throw new InterviewApiError('Your room could not be created. Please try again.', 503)
    const { data: participant, error: participantError } = await db.from('interview_live_participants').insert({ room_id: room.id, user_id: user.id, role: 'candidate', display_name: displayName(profile?.full_name, user.email) }).select('id').single()
    if (participantError || !participant) {
      await db.from('interview_live_rooms').delete().eq('id', room.id)
      throw new InterviewApiError('Your room could not be prepared. Please try again.', 503)
    }
    await db.from('interview_live_events').insert({ room_id: room.id, actor_id: user.id, event_type: 'room_created', metadata: { format: station.format, station_id: station.id, recording_enabled: room.recording_enabled } })
    return Response.json({ roomId: room.id, inviteCode }, { status: 201, headers: { 'Cache-Control': 'private, no-store' } })
  }
  throw new InterviewApiError('A secure invite code could not be created. Please try again.', 503)
}

async function joinRoom(user: NonNullable<Awaited<ReturnType<typeof getUser>>>, body: Record<string, unknown>) {
  const code = normaliseInviteCode(body.code)
  if (code.length !== 6) throw new InterviewApiError('Enter the six-character room code.')
  const db = createAdminClient(), since = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  const { count } = await db.from('interview_live_join_attempts').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('attempted_at', since)
  if ((count ?? 0) >= 20) throw new InterviewApiError('Too many room-code attempts. Wait ten minutes before trying again.', 429)
  await db.from('interview_live_join_attempts').insert({ user_id: user.id })
  const inviteHash = await hashInviteCode(code)
  const { data: room, error } = await db.from('interview_live_rooms').select('*').eq('invite_code_hash', inviteHash).maybeSingle()
  if (error) throw new InterviewApiError('The room could not be checked. Please try again.', 503)
  if (!room || Date.parse(room.expires_at) <= Date.now()) throw new InterviewApiError('That room code is invalid or has expired.', 404)
  await requireInterviewPractice(user, room.station_id, room.question_index, true)
  const { data: existing } = await db.from('interview_live_participants').select('id').eq('room_id', room.id).eq('user_id', user.id).is('left_at', null).maybeSingle()
  if (existing) return Response.json({ roomId: room.id }, { headers: { 'Cache-Control': 'private, no-store' } })
  if (room.phase !== 'lobby') throw new InterviewApiError('This station has already started. Ask the host to create a fresh room.', 409)
  if (room.candidate_id === user.id) throw new InterviewApiError('Open this room from the device where you created it.', 409)
  const profile = await getProfile()
  const { data: participant, error: joinError } = await db.from('interview_live_participants').insert({ room_id: room.id, user_id: user.id, role: 'examiner', display_name: displayName(profile?.full_name, user.email) }).select('id').single()
  if (joinError?.code === '23505') throw new InterviewApiError('This private room already has an examiner.', 409)
  if (joinError || !participant) throw new InterviewApiError('You could not join this room. Please try again.', 503)
  await db.from('interview_live_events').insert({ room_id: room.id, actor_id: user.id, event_type: 'participant_joined', metadata: { role: 'examiner' } })
  return Response.json({ roomId: room.id }, { headers: { 'Cache-Control': 'private, no-store' } })
}

function displayName(fullName: string | null | undefined, email: string | undefined) {
  return (fullName?.trim() || email?.split('@')[0] || 'Student').slice(0, 80)
}
