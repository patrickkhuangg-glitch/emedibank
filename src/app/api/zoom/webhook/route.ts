import { createHmac, timingSafeEqual } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getZoomParticipants } from '@/lib/zoom/client'

export const runtime = 'nodejs'

type ZoomWebhook = {
  event?: string
  payload?: {
    plainToken?: string
    object?: {
      id?: number | string
      uuid?: string
      duration?: number
      start_time?: string
      end_time?: string
    }
  }
}
type ZoomMeetingObject = NonNullable<NonNullable<ZoomWebhook['payload']>['object']>

export async function POST(request: Request) {
  const secret = process.env.ZOOM_WEBHOOK_SECRET_TOKEN
  if (!secret) return NextResponse.json({ error: 'Zoom webhook is not configured.' }, { status: 503 })

  const body = await request.text()
  const payload = JSON.parse(body) as ZoomWebhook

  if (payload.event === 'endpoint.url_validation') {
    const plainToken = payload.payload?.plainToken
    if (!plainToken) return NextResponse.json({ error: 'Missing Zoom validation token.' }, { status: 400 })
    return NextResponse.json({
      plainToken,
      encryptedToken: createHmac('sha256', secret).update(plainToken).digest('hex'),
    })
  }

  if (!validSignature(request, body, secret)) return NextResponse.json({ error: 'Invalid Zoom signature.' }, { status: 401 })
  if (payload.event !== 'meeting.ended') return NextResponse.json({ received: true })

  const meetingId = String(payload.payload?.object?.id ?? '')
  if (!meetingId) return NextResponse.json({ received: true })

  const admin = createAdminClient()
  const { data: session } = await admin
    .from('tutoring_sessions')
    .select('id,plan_id,student_email,booked_minutes,base_deducted_at')
    .eq('zoom_meeting_id', meetingId)
    .maybeSingle()
  if (!session || session.base_deducted_at) return NextResponse.json({ received: true })

  try {
    const participants = await getZoomParticipants(meetingId)
    const studentEmail = session.student_email.toLowerCase()
    const studentAttended = participants.some((participant) => participant.email?.toLowerCase() === studentEmail)
    const actualMinutes = meetingMinutes(payload.payload?.object)

    const { error } = await admin.rpc('complete_tutoring_session', {
      p_session_id: session.id,
      p_actual_minutes: actualMinutes,
      p_student_attended: studentAttended,
    })
    if (error) throw error

    revalidatePath('/admin')
    revalidatePath('/admin/study-plans')
    revalidatePath(`/admin/study-plans/${session.plan_id}`)
    revalidatePath('/study-plan')
  } catch (error) {
    // A non-2xx response prompts Zoom to retry. No student or meeting data is logged.
    console.error('Zoom tutoring session sync failed.', error)
    return NextResponse.json({ error: 'Unable to sync the Zoom meeting yet.' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

function validSignature(request: Request, body: string, secret: string) {
  const timestamp = request.headers.get('x-zm-request-timestamp')
  const signature = request.headers.get('x-zm-signature')
  if (!timestamp || !signature) return false
  const expected = `v0=${createHmac('sha256', secret).update(`v0:${timestamp}:${body}`).digest('hex')}`
  const expectedBytes = Buffer.from(expected)
  const actualBytes = Buffer.from(signature)
  return expectedBytes.length === actualBytes.length && timingSafeEqual(expectedBytes, actualBytes)
}

function meetingMinutes(meeting: ZoomMeetingObject | undefined) {
  if (typeof meeting?.duration === 'number' && meeting.duration >= 0) return Math.round(meeting.duration)
  if (meeting?.start_time && meeting?.end_time) {
    const difference = new Date(meeting.end_time).getTime() - new Date(meeting.start_time).getTime()
    if (difference >= 0) return Math.round(difference / 60_000)
  }
  return 0
}
