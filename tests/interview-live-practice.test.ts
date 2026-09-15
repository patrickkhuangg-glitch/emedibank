import assert from 'node:assert/strict'
import test from 'node:test'
import { canStartLiveRoom, createInviteCode, hashInviteCode, nextLiveRoomPhase, normaliseInviteCode, visibleStationForRole, type LiveRoomParticipant } from '../src/lib/interviews/live-practice'
import { liveIceServers } from '../src/lib/interviews/live-ice'
import { formatSpeakerTranscript, isDiarizedTranscript } from '../src/lib/interviews/speaker-transcript'
import { mmiSource } from '../src/lib/interviews/mmi-evidence'

test('live room codes avoid ambiguous characters and hash deterministically', async () => {
  const code = createInviteCode(new Uint8Array([0, 1, 2, 3, 4, 5]))
  assert.equal(code, 'ABCDEF')
  assert.equal(normaliseInviteCode(' ab-cd ef '), 'ABCDEF')
  assert.equal(await hashInviteCode('ABCDEF'), await hashInviteCode('ab-cd-ef'))
  assert.equal((await hashInviteCode(code)).length, 64)
})

test('room can start only with two distinct ready roles and unanimous consent', () => {
  const participants: LiveRoomParticipant[] = [
    { id: '1', userId: 'u1', displayName: 'Candidate', role: 'candidate', ready: true, mediaReady: true, recordingConsent: true, lastSeenAt: '', leftAt: null },
    { id: '2', userId: 'u2', displayName: 'Examiner', role: 'examiner', ready: true, mediaReady: true, recordingConsent: true, lastSeenAt: '', leftAt: null },
  ]
  assert.equal(canStartLiveRoom(participants, true), true)
  assert.equal(canStartLiveRoom([{ ...participants[0], recordingConsent: false }, participants[1]], true), false)
  assert.equal(canStartLiveRoom([{ ...participants[0], mediaReady: false }, participants[1]], false), false)
  assert.equal(canStartLiveRoom(participants.slice(0, 1), false), false)
})

test('the server phase sequence uses format timing', () => {
  assert.deepEqual(nextLiveRoomPhase('lobby', 'mmi'), { phase: 'briefing', durationSeconds: 30 })
  assert.deepEqual(nextLiveRoomPhase('briefing', 'mmi'), { phase: 'preparation', durationSeconds: 120 })
  assert.deepEqual(nextLiveRoomPhase('preparation', 'mmi'), { phase: 'live_station', durationSeconds: 480 })
  assert.deepEqual(nextLiveRoomPhase('briefing', 'panel'), { phase: 'live_station', durationSeconds: 120 })
  assert.deepEqual(nextLiveRoomPhase('live_station', 'panel'), { phase: 'marking', durationSeconds: null })
})

test('station content and examiner guidance stay hidden until their phases', () => {
  const station = { id: 'station', format: 'mmi' as const, title: 'Private station', category: 'Ethics', preparation: 'Secret scenario', questions: ['Secret question'], examinerFeedback: { strongResponse: [{ title: 'Evidence', description: 'Use evidence.' }], commonWeaknesses: [] } }
  assert.equal(visibleStationForRole(station, 'candidate', 'briefing').preparation, null)
  assert.deepEqual(visibleStationForRole(station, 'examiner', 'preparation').questions, ['Secret question'])
  assert.equal(visibleStationForRole(station, 'examiner', 'live_station').examinerGuide, null)
  assert.ok(visibleStationForRole(station, 'examiner', 'marking').examinerGuide)
  assert.equal(visibleStationForRole(station, 'candidate', 'debrief').examinerGuide, null)
})

test('live ICE configuration keeps TURN credentials server-delivered and validates incomplete configuration', async () => {
  assert.equal((await liveIceServers({})).length, 1)
  const servers = await liveIceServers({ INTERVIEW_TURN_URLS: 'turn:relay.example.com:3478,turns:relay.example.com:5349', INTERVIEW_TURN_USERNAME: 'temporary-user', INTERVIEW_TURN_CREDENTIAL: 'temporary-secret' })
  assert.equal(servers.length, 2)
  assert.deepEqual(servers[1], { urls: ['turn:relay.example.com:3478', 'turns:relay.example.com:5349'], username: 'temporary-user', credential: 'temporary-secret' })
  await assert.rejects(liveIceServers({ INTERVIEW_TURN_URLS: 'turn:relay.example.com:3478' }), /invalid_interview_turn_credentials/)
  await assert.rejects(liveIceServers({ INTERVIEW_TURN_URLS: 'https:\/\/not-turn.example.com', INTERVIEW_TURN_USERNAME: 'u', INTERVIEW_TURN_CREDENTIAL: 'p' }), /invalid_interview_turn_urls/)
})

test('Cloudflare TURN credentials are generated per room request and never expose the long-lived token', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = []
  const iceServers = [{ urls: ['stun:stun.cloudflare.com:3478'] }, { urls: ['turn:turn.cloudflare.com:3478?transport=udp', 'turns:turn.cloudflare.com:443?transport=tcp'], username: 'short-lived-user', credential: 'short-lived-secret' }]
  const servers = await liveIceServers(
    { INTERVIEW_TURN_KEY_ID: '0123456789abcdef0123456789abcdef', INTERVIEW_TURN_API_TOKEN: 'server-only-token' },
    async (url, init) => { calls.push({ url: String(url), init }); return Response.json({ iceServers }, { status: 201 }) },
  )
  assert.deepEqual(servers, iceServers)
  assert.equal(calls.length, 1)
  assert.match(calls[0].url, /0123456789abcdef0123456789abcdef\/credentials\/generate-ice-servers$/)
  assert.equal((calls[0].init?.headers as Record<string, string>).Authorization, 'Bearer server-only-token')
  assert.deepEqual(JSON.parse(String(calls[0].init?.body)), { ttl: 7200 })
  assert.ok(!JSON.stringify(servers).includes('server-only-token'))
  await assert.rejects(liveIceServers({ INTERVIEW_TURN_KEY_ID: '0123456789abcdef0123456789abcdef' }), /invalid_interview_turn_provider_configuration/)
})

test('live transcripts preserve neutral, timed speaker turns without inventing roles', () => {
  const payload = { segments: [
    { speaker: 'A', text: 'Could you begin?', start: 0.4, end: 2.1 },
    { speaker: 'B', text: 'I would first clarify the concern.', start: 3.2, end: 7.8 },
    { speaker: 'A', text: 'What would you do next?', start: 9, end: 11 },
  ] }
  assert.equal(isDiarizedTranscript(payload), true)
  const transcript = formatSpeakerTranscript(payload.segments)
  assert.equal(transcript, '[0:00] Speaker 1: Could you begin?\n\n[0:03] Speaker 2: I would first clarify the concern.\n\n[0:09] Speaker 1: What would you do next?')
  const turns = mmiSource({}, transcript).references.filter(item => item.speaker !== 'prompt')
  assert.deepEqual(turns.map(item => item.speaker), ['unknown', 'unknown', 'unknown'])
  assert.deepEqual(turns.map(item => item.timestamp), ['[0:00]', '[0:03]', '[0:09]'])
})
