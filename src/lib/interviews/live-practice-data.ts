import 'server-only'

import type { User } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { InterviewApiError } from './api'
import { INTERVIEW_STATIONS } from './stations'
import { nextLiveRoomPhase, phaseDeadline, visibleStationForRole, type LiveRoomHistoryItem, type LiveRoomSnapshot } from './live-practice'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function ownedLiveRoom(roomId: string, user: User) {
  if (!uuid.test(roomId)) throw new InterviewApiError('Practice room not found.', 404)
  const db = createAdminClient()
  const [{ data: room, error: roomError }, { data: participant, error: participantError }] = await Promise.all([
    db.from('interview_live_rooms').select('*').eq('id', roomId).maybeSingle(),
    db.from('interview_live_participants').select('*').eq('room_id', roomId).eq('user_id', user.id).is('left_at', null).maybeSingle(),
  ])
  if (roomError || participantError) throw new InterviewApiError('The live practice service is unavailable. Please try again.', 503)
  if (!room || !participant) throw new InterviewApiError('Practice room not found.', 404)
  if (Date.parse(room.expires_at) <= Date.now() && room.phase !== 'complete') throw new InterviewApiError('This room has expired. Create a fresh room to practise together.', 410)
  return { db, room, participant }
}

export async function advanceExpiredPhase(roomId: string, user: User) {
  let owned = await ownedLiveRoom(roomId, user)
  for (let index = 0; index < 4; index++) {
    const deadline = owned.room.phase_ends_at ? Date.parse(owned.room.phase_ends_at) : null
    if (!deadline || deadline > Date.now() || !['briefing', 'preparation', 'live_station'].includes(owned.room.phase)) break
    const next = nextLiveRoomPhase(owned.room.phase, owned.room.format)
    const startedAt = new Date(deadline).toISOString()
    const { data } = await owned.db.from('interview_live_rooms').update({
      phase: next.phase,
      phase_revision: owned.room.phase_revision + 1,
      phase_started_at: startedAt,
      phase_ends_at: phaseDeadline(next.durationSeconds, deadline),
      updated_at: new Date().toISOString(),
    }).eq('id', owned.room.id).eq('phase_revision', owned.room.phase_revision).select('*').maybeSingle()
    if (!data) break
    await owned.db.from('interview_live_events').insert({ room_id: roomId, actor_id: null, event_type: 'phase_auto_advanced', metadata: { from: owned.room.phase, to: next.phase, revision: data.phase_revision } })
    owned = { ...owned, room: data }
  }
  return owned
}

export async function liveRoomSnapshot(roomId: string, user: User): Promise<LiveRoomSnapshot> {
  const { db, room, participant } = await advanceExpiredPhase(roomId, user)
  let currentRoom = room
  const station = INTERVIEW_STATIONS.find(item => item.id === room.station_id && item.format === room.format)
  if (!station) throw new InterviewApiError('This room’s station is no longer available.', 409)
  const [{ data: participants, error: participantError }, { data: feedback, error: feedbackError }] = await Promise.all([
    db.from('interview_live_participants').select('*').eq('room_id', room.id).order('joined_at'),
    db.from('interview_live_feedback').select('*').eq('room_id', room.id),
  ])
  if (participantError || feedbackError) throw new InterviewApiError('Room details could not be refreshed.', 503)
  if (!['lobby', 'complete'].includes(room.phase)) {
    const active = (participants ?? []).filter(item => !item.left_at)
    const host = active.find(item => item.user_id === room.host_id), replacement = active.find(item => item.user_id !== room.host_id && Date.now() - Date.parse(item.last_seen_at) < 35_000)
    if (host && replacement && Date.now() - Date.parse(host.last_seen_at) > 60_000) {
      const { data: transferred } = await db.from('interview_live_rooms').update({ host_id: replacement.user_id, updated_at: new Date().toISOString() }).eq('id', room.id).eq('host_id', host.user_id).select('*').maybeSingle()
      if (transferred) {
        currentRoom = transferred
        await db.from('interview_live_events').insert({ room_id: room.id, actor_id: replacement.user_id, event_type: 'host_transferred', metadata: { previous_host_id: host.user_id, phase: room.phase } })
      }
    }
  }
  const selectedStation = station.format === 'panel'
    ? { ...station, questions: station.questions.slice(room.question_index, room.question_index + 1) }
    : station
  const revealFeedback = ['debrief', 'complete'].includes(room.phase)
  return {
    id: room.id,
    hostId: currentRoom.host_id,
    role: participant.role,
    participantId: participant.id,
    station: visibleStationForRole(selectedStation, participant.role, room.phase),
    phase: room.phase,
    phaseRevision: room.phase_revision,
    phaseStartedAt: room.phase_started_at,
    phaseEndsAt: room.phase_ends_at,
    recordingEnabled: room.recording_enabled,
    recordingAttemptId: room.recording_attempt_id,
    participants: (participants ?? []).map(item => ({ id: item.id, userId: item.user_id, displayName: item.display_name, role: item.role, ready: item.ready, mediaReady: item.media_ready, recordingConsent: item.recording_consent, lastSeenAt: item.last_seen_at, leftAt: item.left_at })),
    feedback: (feedback ?? []).filter(item => item.participant_id === participant.id || revealFeedback).map(item => ({ participantId: item.participant_id, role: item.role, answers: isAnswers(item.answers) ? item.answers : {}, submittedAt: item.submitted_at })),
    createdAt: room.created_at,
    expiresAt: room.expires_at,
  }
}

function isAnswers(value: unknown): value is Record<string, number | string> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

export async function listLivePracticeRooms(userId: string): Promise<LiveRoomHistoryItem[]> {
  try {
    const db = createAdminClient()
    const { data: membership, error } = await db.from('interview_live_participants').select('room_id,role').eq('user_id', userId).order('joined_at', { ascending: false }).limit(12)
    if (error || !membership?.length) return []
    const { data: rooms } = await db.from('interview_live_rooms').select('id,station_id,phase,created_at,recording_attempt_id').in('id', membership.map(item => item.room_id)).order('created_at', { ascending: false })
    const roleByRoom = new Map(membership.map(item => [item.room_id, item.role]))
    return (rooms ?? []).map(room => ({ id:room.id, title:INTERVIEW_STATIONS.find(item => item.id === room.station_id)?.title ?? 'Interview practice', role:roleByRoom.get(room.id) ?? 'candidate', phase:room.phase, createdAt:room.created_at, recordingAttemptId:room.recording_attempt_id }))
  } catch { return [] }
}
