import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/dal'
import { googleCalendarConfig } from '@/lib/google-calendar'
import { SITE_URL } from '@/lib/site'

export async function GET() {
  await requireAdmin()
  const { clientId } = googleCalendarConfig()
  const state = randomUUID()
  const redirectUri = `${SITE_URL}/api/google-calendar/callback`
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar.events',
    access_type: 'offline',
    prompt: 'consent',
    state,
  })
  const response = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`)
  response.cookies.set('studocyte_google_calendar_state', state, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600, path: '/' })
  return response
}
