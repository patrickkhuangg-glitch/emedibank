import { NextResponse } from 'next/server'
import { tutoringCalendarIcs } from '@/lib/calendar'
import { getProfile, getUser } from '@/lib/auth/dal'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function GET(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const profile = await getProfile()
  const user = await getUser()
  if (!profile || !user || (profile.role !== 'admin' && profile.role !== 'tutor')) return NextResponse.redirect(new URL('/login?redirectTo=/bookings', request.url))

  const { sessionId } = await params
  const { data: session } = await createAdminClient()
    .from('tutoring_sessions')
    .select('id,title,scheduled_for,booked_minutes,tutor_id')
    .eq('id', sessionId)
    .maybeSingle()

  if (!session || (profile.role === 'tutor' && session.tutor_id !== user.id)) return NextResponse.redirect(new URL('/bookings', request.url))

  const launchUrl = new URL(`/api/zoom/sessions/${session.id}/start`, request.url).toString()
  const fileName = `${session.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'tutoring-session'}.ics`
  return new NextResponse(tutoringCalendarIcs({
    id: session.id,
    title: session.title,
    scheduledFor: session.scheduled_for,
    bookedMinutes: session.booked_minutes,
    launchUrl,
  }), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
