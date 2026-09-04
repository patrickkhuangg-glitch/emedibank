import { NextResponse } from 'next/server'
import { tutoringCalendarIcs } from '@/lib/calendar'
import { getProfile } from '@/lib/auth/dal'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function GET(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const profile = await getProfile()
  if (profile?.role !== 'admin') return NextResponse.redirect(new URL('/login?redirectTo=/admin', request.url))

  const { sessionId } = await params
  const { data: session } = await createAdminClient()
    .from('tutoring_sessions')
    .select('id,title,scheduled_for,booked_minutes')
    .eq('id', sessionId)
    .maybeSingle()

  if (!session) return NextResponse.redirect(new URL('/admin/study-plans', request.url))

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
