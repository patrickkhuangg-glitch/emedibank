import { getUser } from '@/lib/auth/dal'
import { apiError, InterviewApiError, readSmallJson } from '@/lib/interviews/api'
import { canStartLiveRoom, nextLiveRoomPhase, phaseDeadline, type LiveRoomRole } from '@/lib/interviews/live-practice'
import { liveRoomSnapshot, ownedLiveRoom } from '@/lib/interviews/live-practice-data'

export async function GET(_request: Request, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const user = await getUser()
    if (!user) throw new InterviewApiError('Sign in required.', 401)
    const { roomId } = await params
    return Response.json(await liveRoomSnapshot(roomId, user), { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return apiError(error) }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const user = await getUser()
    if (!user) throw new InterviewApiError('Sign in required.', 401)
    if (request.headers.get('origin') !== new URL(request.url).origin) throw new InterviewApiError('Request origin is not allowed.', 403)
    const { roomId } = await params, body = await readSmallJson(request)
    const owned = await ownedLiveRoom(roomId, user)
    if (body.action === 'presence') await updatePresence(owned, body)
    else if (body.action === 'ready') await updateReady(owned, body)
    else if (body.action === 'start') await startRoom(owned, user.id)
    else if (body.action === 'advance') await advanceRoom(owned, user.id)
    else if (body.action === 'feedback') await submitFeedback(owned, body)
    else if (body.action === 'withdraw_recording') await withdrawRecording(owned, user.id)
    else if (body.action === 'recording_saved') await attachRecording(owned, user.id, body)
    else if (body.action === 'leave') await leaveRoom(owned, user.id)
    else throw new InterviewApiError('Choose a valid room action.')
    return Response.json(await liveRoomSnapshot(roomId, user), { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return apiError(error) }
}

type Owned = Awaited<ReturnType<typeof ownedLiveRoom>>

async function updatePresence({ db, participant }: Owned, body: Record<string, unknown>) {
  const update: { last_seen_at: string; media_ready?: boolean } = { last_seen_at: new Date().toISOString() }
  if (typeof body.mediaReady === 'boolean') update.media_ready = body.mediaReady
  const { error } = await db.from('interview_live_participants').update(update).eq('id', participant.id)
  if (error) throw new InterviewApiError('Your room presence could not be updated.', 503)
}

async function updateReady({ db, room, participant }: Owned, body: Record<string, unknown>) {
  if (room.phase !== 'lobby') throw new InterviewApiError('Readiness is locked after the station starts.', 409)
  if (typeof body.ready !== 'boolean') throw new InterviewApiError('Choose whether you are ready.')
  if (room.recording_enabled && typeof body.recordingConsent !== 'boolean') throw new InterviewApiError('Choose whether you consent to this room being recorded.')
  const { error } = await db.from('interview_live_participants').update({ ready: body.ready, recording_consent: room.recording_enabled ? body.recordingConsent as boolean : null, last_seen_at: new Date().toISOString() }).eq('id', participant.id)
  if (error) throw new InterviewApiError('Your readiness could not be saved.', 503)
  await db.from('interview_live_events').insert({ room_id: room.id, actor_id: participant.user_id, event_type: 'readiness_changed', metadata: { role: participant.role, ready: body.ready, recording_consent: room.recording_enabled ? body.recordingConsent : null } })
}

async function startRoom({ db, room }: Owned, actorId: string) {
  if (room.host_id !== actorId) throw new InterviewApiError('Only the room host can start the station.', 403)
  if (room.phase !== 'lobby') return
  const { data: rows, error } = await db.from('interview_live_participants').select('*').eq('room_id', room.id).is('left_at', null)
  if (error) throw new InterviewApiError('The room could not be started.', 503)
  const participants = (rows ?? []).map(item => ({ id: item.id, userId: item.user_id, displayName: item.display_name, role: item.role, ready: item.ready, mediaReady: item.media_ready, recordingConsent: item.recording_consent, lastSeenAt: item.last_seen_at, leftAt: item.left_at }))
  if (!canStartLiveRoom(participants, room.recording_enabled)) throw new InterviewApiError(room.recording_enabled ? 'Both people need working media, readiness and recording consent before starting.' : 'Both people need working media and readiness before starting.', 409)
  const next = nextLiveRoomPhase('lobby', room.format), now = Date.now()
  const { data } = await db.from('interview_live_rooms').update({ phase: next.phase, phase_revision: room.phase_revision + 1, phase_started_at: new Date(now).toISOString(), phase_ends_at: phaseDeadline(next.durationSeconds, now), updated_at: new Date(now).toISOString() }).eq('id', room.id).eq('phase_revision', room.phase_revision).eq('phase', 'lobby').select('id').maybeSingle()
  if (!data) throw new InterviewApiError('The room changed in another tab. Refresh before starting.', 409)
  await db.from('interview_live_events').insert({ room_id: room.id, actor_id: actorId, event_type: 'station_started', metadata: { recording_enabled: room.recording_enabled } })
}

async function advanceRoom({ db, room }: Owned, actorId: string) {
  if (room.host_id !== actorId) throw new InterviewApiError('Only the room host can move the station forward.', 403)
  if (room.phase === 'lobby') throw new InterviewApiError('Start the station from the lobby first.', 409)
  if (['marking', 'complete'].includes(room.phase)) throw new InterviewApiError('This phase advances when its work is complete.', 409)
  const next = nextLiveRoomPhase(room.phase, room.format), now = Date.now()
  const { data } = await db.from('interview_live_rooms').update({ phase: next.phase, phase_revision: room.phase_revision + 1, phase_started_at: new Date(now).toISOString(), phase_ends_at: phaseDeadline(next.durationSeconds, now), updated_at: new Date(now).toISOString(), completed_at: next.phase === 'complete' ? new Date(now).toISOString() : null }).eq('id', room.id).eq('phase_revision', room.phase_revision).select('id').maybeSingle()
  if (!data) throw new InterviewApiError('The room changed in another tab. Refresh and try again.', 409)
  await db.from('interview_live_events').insert({ room_id: room.id, actor_id: actorId, event_type: 'phase_advanced', metadata: { from: room.phase, to: next.phase } })
}

async function submitFeedback({ db, room, participant }: Owned, body: Record<string, unknown>) {
  if (room.phase !== 'marking') throw new InterviewApiError('Feedback opens after the live station.', 409)
  const answers = validateFeedback(participant.role, body.answers)
  const now = new Date().toISOString()
  const { error } = await db.from('interview_live_feedback').upsert({ room_id: room.id, participant_id: participant.id, role: participant.role, answers, submitted_at: now, updated_at: now }, { onConflict: 'room_id,participant_id' })
  if (error) throw new InterviewApiError('Your feedback could not be saved. Please try again.', 503)
  await db.from('interview_live_events').insert({ room_id: room.id, actor_id: participant.user_id, event_type: 'feedback_submitted', metadata: { role: participant.role } })
  const { count } = await db.from('interview_live_feedback').select('id', { count: 'exact', head: true }).eq('room_id', room.id).not('submitted_at', 'is', null)
  if ((count ?? 0) >= 2) {
    const nowMs = Date.now()
    await db.from('interview_live_rooms').update({ phase: 'debrief', phase_revision: room.phase_revision + 1, phase_started_at: new Date(nowMs).toISOString(), phase_ends_at: null, updated_at: new Date(nowMs).toISOString() }).eq('id', room.id).eq('phase_revision', room.phase_revision).eq('phase', 'marking')
  }
}

async function attachRecording({ db, room, participant }: Owned, actorId: string, body: Record<string, unknown>) {
  if (participant.role !== 'candidate' || room.candidate_id !== actorId) throw new InterviewApiError('Only the candidate can save this room recording.', 403)
  if (!room.recording_enabled) throw new InterviewApiError('Recording was not enabled for this room.', 409)
  const attemptId = typeof body.attemptId === 'string' ? body.attemptId : ''
  const { data: attempt } = await db.from('interview_attempts').select('id,user_id,station_id,upload_status').eq('id', attemptId).eq('user_id', actorId).eq('station_id', room.station_id).maybeSingle()
  if (!attempt || attempt.upload_status !== 'ready') throw new InterviewApiError('Finish saving the recording before attaching it to this room.', 409)
  const { error } = await db.from('interview_live_rooms').update({ recording_attempt_id: attempt.id, updated_at: new Date().toISOString() }).eq('id', room.id).is('recording_attempt_id', null)
  if (error) throw new InterviewApiError('The recording could not be linked to this room.', 503)
  await db.from('interview_live_events').insert({ room_id: room.id, actor_id: actorId, event_type: 'recording_saved', metadata: { attempt_id: attempt.id } })
}

async function withdrawRecording({ db, room, participant }: Owned, actorId: string) {
  if (!room.recording_enabled || !['briefing', 'preparation', 'live_station'].includes(room.phase)) return
  const now = new Date().toISOString()
  const { error } = await db.from('interview_live_rooms').update({ recording_enabled: false, updated_at: now }).eq('id', room.id).eq('recording_enabled', true)
  if (error) throw new InterviewApiError('Recording consent could not be withdrawn. Stop camera and microphone while reconnecting, then try again.', 503)
  await db.from('interview_live_participants').update({ recording_consent: false, last_seen_at: now }).eq('id', participant.id)
  await db.from('interview_live_events').insert({ room_id: room.id, actor_id: actorId, event_type: 'recording_consent_withdrawn', metadata: { role: participant.role, phase: room.phase } })
}

async function leaveRoom({ db, room, participant }: Owned, actorId: string) {
  if (room.phase === 'complete') return
  await db.from('interview_live_participants').update({ left_at: new Date().toISOString(), ready: false, media_ready: false }).eq('id', participant.id)
  await db.from('interview_live_events').insert({ room_id: room.id, actor_id: actorId, event_type: 'participant_left', metadata: { role: participant.role, phase: room.phase } })
}

function validateFeedback(role: LiveRoomRole, value: unknown): Record<string, number | string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new InterviewApiError('Complete the feedback before submitting.')
  const input = value as Record<string, unknown>
  const rating = (key: string) => {
    const item = Number(input[key])
    if (!Number.isInteger(item) || item < 1 || item > 5) throw new InterviewApiError('Choose a rating from 1 to 5 for each scale.')
    return item
  }
  const text = (key: string, minimum = 3) => {
    const item = typeof input[key] === 'string' ? input[key].trim() : ''
    if (item.length < minimum || item.length > 600) throw new InterviewApiError('Add a short, specific feedback note before submitting.')
    return item
  }
  return role === 'candidate'
    ? { confidence: rating('confidence'), structure: rating('structure'), nextFocus: text('nextFocus') }
    : { reasoning: rating('reasoning'), communication: rating('communication'), evidence: text('evidence', 8), nextStep: text('nextStep', 8) }
}
