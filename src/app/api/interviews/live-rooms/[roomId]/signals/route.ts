import { getUser } from '@/lib/auth/dal'
import { apiError, InterviewApiError, readSmallJson } from '@/lib/interviews/api'
import { ownedLiveRoom } from '@/lib/interviews/live-practice-data'
import type { LiveSignalKind } from '@/lib/interviews/live-practice'

const signalKinds = new Set<LiveSignalKind>(['offer', 'answer', 'ice', 'renegotiate'])

export async function GET(request: Request, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const user = await getUser()
    if (!user) throw new InterviewApiError('Sign in required.', 401)
    const { roomId } = await params, { db, participant } = await ownedLiveRoom(roomId, user)
    const after = Math.max(0, Number(new URL(request.url).searchParams.get('after') ?? 0) || 0)
    const { data, error } = await db.from('interview_live_signals').select('id,sender_id,kind,payload,created_at').eq('room_id', roomId).eq('recipient_id', participant.id).gt('id', after).order('id').limit(100)
    if (error) throw new InterviewApiError('The live connection could not be refreshed.', 503)
    return Response.json({ signals: data ?? [] }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return apiError(error) }
}
export async function POST(request: Request, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const user = await getUser()
    if (!user) throw new InterviewApiError('Sign in required.', 401)
    if (request.headers.get('origin') !== new URL(request.url).origin) throw new InterviewApiError('Request origin is not allowed.', 403)
    const { roomId } = await params, body = await readSmallJson(request), { db, participant } = await ownedLiveRoom(roomId, user)
    const kind = String(body.kind) as LiveSignalKind, recipientId = typeof body.recipientId === 'string' ? body.recipientId : ''
    if (!signalKinds.has(kind) || !recipientId || !body.payload || typeof body.payload !== 'object' || Array.isArray(body.payload)) throw new InterviewApiError('Invalid live-connection message.')
    if (JSON.stringify(body.payload).length > 24000) throw new InterviewApiError('Live-connection message is too large.', 413)
    const { data: recipient } = await db.from('interview_live_participants').select('id').eq('id', recipientId).eq('room_id', roomId).is('left_at', null).maybeSingle()
    if (!recipient || recipient.id === participant.id) throw new InterviewApiError('The other participant is no longer in this room.', 409)
    const { error } = await db.from('interview_live_signals').insert({ room_id: roomId, sender_id: participant.id, recipient_id: recipient.id, kind, payload: body.payload })
    if (error) throw new InterviewApiError('The live connection could not be updated.', 503)
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return apiError(error) }
}
