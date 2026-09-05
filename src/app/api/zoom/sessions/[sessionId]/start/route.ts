import { NextResponse } from 'next/server'
import { getProfile, getUser } from '@/lib/auth/dal'
import { createAdminClient } from '@/lib/supabase/admin'
import { getZoomMeetingStartUrl } from '@/lib/zoom/client'

export const runtime = 'nodejs'

export async function GET(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const profile = await getProfile()
  const user = await getUser()
  if (!profile || !user || (profile.role !== 'admin' && profile.role !== 'tutor')) return NextResponse.redirect(new URL('/login?redirectTo=/bookings', request.url))

  const { sessionId } = await params
  const admin = createAdminClient()
  const { data: session } = await admin
    .from('tutoring_sessions')
    .select('zoom_meeting_id,status,tutor_id')
    .eq('id', sessionId)
    .maybeSingle()
  if (!session || session.status !== 'scheduled' || (profile.role === 'tutor' && session.tutor_id !== user.id)) return NextResponse.redirect(new URL('/bookings', request.url))

  try {
    const startUrl = await getZoomMeetingStartUrl(session.zoom_meeting_id)
    await admin.from('tutoring_sessions').update({ zoom_start_url: startUrl, updated_at: new Date().toISOString() }).eq('id', sessionId)
    return NextResponse.redirect(startUrl)
  } catch {
    return NextResponse.redirect(new URL('/bookings?error=start_link_failed', request.url))
  }
}
