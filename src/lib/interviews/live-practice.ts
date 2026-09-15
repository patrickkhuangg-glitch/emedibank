import type { InterviewFormat, InterviewStation } from './stations'
import { getInterviewTiming } from './timing'

export const LIVE_ROOM_PHASES = ['lobby', 'briefing', 'preparation', 'live_station', 'marking', 'debrief', 'complete'] as const
export type LiveRoomPhase = (typeof LIVE_ROOM_PHASES)[number]
export type LiveRoomRole = 'candidate' | 'examiner'
export type LiveSignalKind = 'offer' | 'answer' | 'ice' | 'renegotiate'

export type LiveRoomParticipant = {
  id: string
  userId: string
  displayName: string
  role: LiveRoomRole
  ready: boolean
  mediaReady: boolean
  recordingConsent: boolean | null
  lastSeenAt: string
  leftAt: string | null
}

export type LiveRoomFeedback = {
  participantId: string
  role: LiveRoomRole
  answers: Record<string, number | string>
  submittedAt: string | null
}
export type LiveRoomHistoryItem = { id:string; title:string; role:LiveRoomRole; phase:string; createdAt:string; recordingAttemptId:string|null }

export type LiveRoomSnapshot = {
  id: string
  inviteCode?: string
  hostId: string
  role: LiveRoomRole
  participantId: string
  station: {
    id: string
    format: InterviewFormat
    title: string
    category: string
    preparation: string | null
    questions: string[]
    examinerGuide: InterviewStation['examinerFeedback'] | null
  }
  phase: LiveRoomPhase
  phaseRevision: number
  phaseStartedAt: string | null
  phaseEndsAt: string | null
  recordingEnabled: boolean
  recordingAttemptId: string | null
  participants: LiveRoomParticipant[]
  feedback: LiveRoomFeedback[]
  createdAt: string
  expiresAt: string
}

const INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function createInviteCode(random = crypto.getRandomValues(new Uint8Array(6))) {
  return Array.from(random, value => INVITE_ALPHABET[value % INVITE_ALPHABET.length]).join('')
}

export async function hashInviteCode(code: string) {
  const bytes = new TextEncoder().encode(normaliseInviteCode(code))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('')
}

export function normaliseInviteCode(value: unknown) {
  return typeof value === 'string' ? value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) : ''
}

export function isLiveRoomPhase(value: unknown): value is LiveRoomPhase {
  return typeof value === 'string' && LIVE_ROOM_PHASES.includes(value as LiveRoomPhase)
}

export function nextLiveRoomPhase(phase: LiveRoomPhase, format: InterviewFormat): { phase: LiveRoomPhase; durationSeconds: number | null } {
  const timing = getInterviewTiming(format)
  if (phase === 'lobby') return { phase: 'briefing', durationSeconds: 30 }
  if (phase === 'briefing') return timing.preparationSeconds > 0
    ? { phase: 'preparation', durationSeconds: timing.preparationSeconds }
    : { phase: 'live_station', durationSeconds: timing.responseSeconds }
  if (phase === 'preparation') return { phase: 'live_station', durationSeconds: timing.responseSeconds }
  if (phase === 'live_station') return { phase: 'marking', durationSeconds: null }
  if (phase === 'marking') return { phase: 'debrief', durationSeconds: null }
  if (phase === 'debrief') return { phase: 'complete', durationSeconds: null }
  return { phase: 'complete', durationSeconds: null }
}

export function phaseDeadline(durationSeconds: number | null, now = Date.now()) {
  return durationSeconds === null ? null : new Date(now + durationSeconds * 1000).toISOString()
}

export function phaseLabel(phase: LiveRoomPhase) {
  return ({ lobby: 'Lobby', briefing: 'Private briefing', preparation: 'Preparation', live_station: 'Live station', marking: 'Independent feedback', debrief: 'Debrief', complete: 'Complete' } as const)[phase]
}

export function canStartLiveRoom(participants: LiveRoomParticipant[], recordingEnabled: boolean) {
  const active = participants.filter(item => !item.leftAt)
  return active.length === 2
    && new Set(active.map(item => item.role)).size === 2
    && active.every(item => item.ready && item.mediaReady)
    && (!recordingEnabled || active.every(item => item.recordingConsent === true))
}

export function visibleStationForRole(station: InterviewStation, role: LiveRoomRole, phase: LiveRoomPhase) {
  const contentVisible = ['preparation', 'live_station', 'marking', 'debrief', 'complete'].includes(phase)
  const examinerGuideVisible = role === 'examiner' && ['marking', 'debrief', 'complete'].includes(phase)
  return {
    id: station.id,
    format: station.format,
    title: station.title,
    category: station.category,
    preparation: contentVisible ? station.preparation : null,
    questions: contentVisible ? station.questions : [],
    examinerGuide: examinerGuideVisible ? station.examinerFeedback ?? null : null,
  }
}

export const LIVE_FEEDBACK_FIELDS = {
  candidate: [
    { key: 'confidence', label: 'How confident did that response feel?', low: 'Unsteady', high: 'Confident' },
    { key: 'structure', label: 'How clearly did you structure your answer?', low: 'Hard to follow', high: 'Very clear' },
    { key: 'nextFocus', label: 'One thing I will try next time', placeholder: 'Make it small and specific…' },
  ],
  examiner: [
    { key: 'reasoning', label: 'Reasoning and judgement', low: 'Needs work', high: 'Strong' },
    { key: 'communication', label: 'Communication and empathy', low: 'Needs work', high: 'Strong' },
    { key: 'evidence', label: 'The most useful evidence I noticed', placeholder: 'Name the moment or wording…' },
    { key: 'nextStep', label: 'One actionable next step', placeholder: 'On the next attempt, try…' },
  ],
} as const
