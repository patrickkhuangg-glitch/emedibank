import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/dal'
import { googleCalendarConfig } from '@/lib/google-calendar'
import { SITE_URL } from '@/lib/site'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const error = url.searchParams.get('error')
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const cookieStore = await cookies()
  const expectedState = cookieStore.get('studocyte_google_calendar_state')?.value
  const finish = (status: 'connected' | 'error') => {
    const response = NextResponse.redirect(`${SITE_URL}/admin/zoom?googleCalendar=${status}`)
    response.cookies.set('studocyte_google_calendar_state', '', { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 0, path: '/' })
    return response
  }
  if (error || !code || !state || state !== expectedState) return finish('error')

  const profile = await requireAdmin()
  const { clientId, clientSecret } = googleCalendarConfig()
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${SITE_URL}/api/google-calendar/callback`,
      grant_type: 'authorization_code',
    }),
    cache: 'no-store',
  })
  const payload = await response.json() as { refresh_token?: string }
  if (!response.ok || !payload.refresh_token) return finish('error')

  const { error: saveError } = await createAdminClient().from('google_calendar_connections').upsert({
    user_id: profile.id,
    refresh_token: payload.refresh_token,
    calendar_id: 'primary',
    updated_at: new Date().toISOString(),
  })
  if (saveError) return finish('error')
  return finish('connected')
}
