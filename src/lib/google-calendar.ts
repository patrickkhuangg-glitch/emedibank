import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

type GoogleCalendarConfig = { clientId: string; clientSecret: string }

function config(): GoogleCalendarConfig | null {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET
  return clientId && clientSecret ? { clientId, clientSecret } : null
}

export function isGoogleCalendarConfigured() {
  return Boolean(config())
}

export function googleCalendarConfig() {
  const settings = config()
  if (!settings) throw new Error('Google Calendar is not configured yet.')
  return settings
}

export async function createHostCalendarEvent(input: {
  hostUserId: string
  title: string
  scheduledFor: string
  durationMinutes: number
  zoomStartUrl: string
}) {
  const settings = config()
  if (!settings) return { status: 'not_configured' as const }

  const admin = createAdminClient()
  const { data: connection } = await admin
    .from('google_calendar_connections')
    .select('refresh_token,calendar_id')
    .eq('user_id', input.hostUserId)
    .maybeSingle()
  if (!connection) return { status: 'not_connected' as const }

  const token = await refreshAccessToken(connection.refresh_token, settings)
  const startsAt = new Date(input.scheduledFor)
  const endsAt = new Date(startsAt.getTime() + input.durationMinutes * 60_000)
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(connection.calendar_id)}/events?sendUpdates=none`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      summary: input.title,
      description: `Start this Zoom lesson securely in Studocyte:\n${input.zoomStartUrl}`,
      start: { dateTime: startsAt.toISOString(), timeZone: 'Australia/Brisbane' },
      end: { dateTime: endsAt.toISOString(), timeZone: 'Australia/Brisbane' },
      reminders: { useDefault: true },
    }),
  })
  if (!response.ok) throw new Error('Google Calendar could not add this lesson to the host calendar.')
  const event = await response.json() as { id?: string }
  if (!event.id) throw new Error('Google Calendar did not return an event ID.')
  return { status: 'added' as const, eventId: event.id }
}

export async function deleteHostCalendarEvent(input: {
  hostUserId: string
  eventId: string | null
}) {
  const settings = config()
  if (!settings || !input.eventId) return { status: 'not_available' as const }

  const admin = createAdminClient()
  const { data: connection } = await admin
    .from('google_calendar_connections')
    .select('refresh_token,calendar_id')
    .eq('user_id', input.hostUserId)
    .maybeSingle()
  if (!connection) return { status: 'not_available' as const }

  const token = await refreshAccessToken(connection.refresh_token, settings)
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(connection.calendar_id)}/events/${encodeURIComponent(input.eventId)}?sendUpdates=none`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
  )
  if (!response.ok && response.status !== 404 && response.status !== 410) {
    throw new Error('Google Calendar could not remove this lesson.')
  }
  return { status: 'removed' as const }
}

async function refreshAccessToken(refreshToken: string, settings: GoogleCalendarConfig) {
  const body = new URLSearchParams({
    client_id: settings.clientId,
    client_secret: settings.clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  })
  const payload = await response.json() as { access_token?: string }
  if (!response.ok || !payload.access_token) throw new Error('Reconnect Google Calendar to continue adding lessons automatically.')
  return payload.access_token
}
