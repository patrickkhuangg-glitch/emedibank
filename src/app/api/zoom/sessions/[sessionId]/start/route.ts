import { NextResponse } from 'next/server'
import { getProfile } from '@/lib/auth/dal'
import { createAdminClient } from '@/lib/supabase/admin'
import { getZoomMeetingStartUrl } from '@/lib/zoom/client'

export const runtime = 'nodejs'

export async function GET(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const profile = await getProfile()
  if (profile?.role !== 'admin') return NextResponse.redirect(new URL('/login?redirectTo=/admin', request.url))

  const { sessionId } = await params
  const admin = createAdminClient()
  const { data: session } = await admin
    .from('tutoring_sessions')
    .select('zoom_meeting_id')
    .eq('id', sessionId)
    .maybeSingle()
  if (!session) return NextResponse.redirect(new URL('/admin/study-plans', request.url))

  try {
    const startUrl = await getZoomMeetingStartUrl(session.zoom_meeting_id)
    await admin.from('tutoring_sessions').update({ zoom_start_url: startUrl, updated_at: new Date().toISOString() }).eq('id', sessionId)
    return NextResponse.redirect(startUrl)
  } catch {
    return NextResponse.redirect(new URL('/admin/zoom?error=start_link_failed', request.url))
  }
}
