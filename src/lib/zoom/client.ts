import 'server-only'

type ZoomMeeting = {
  id: number | string
  uuid?: string
  join_url: string
  start_url: string
}

type ZoomParticipant = {
  email?: string
  duration?: number
}

type ZoomConfig = {
  accountId: string
  clientId: string
  clientSecret: string
  hostUserId: string
}

function config(): ZoomConfig | null {
  const accountId = process.env.ZOOM_ACCOUNT_ID
  const clientId = process.env.ZOOM_CLIENT_ID
  const clientSecret = process.env.ZOOM_CLIENT_SECRET
  const hostUserId = process.env.ZOOM_HOST_USER_ID
  return accountId && clientId && clientSecret && hostUserId ? { accountId, clientId, clientSecret, hostUserId } : null
}

export function isZoomConfigured() {
  return Boolean(config())
}

async function accessToken() {
  const settings = config()
  if (!settings) throw new Error('Zoom is not connected yet. Add the Zoom server credentials in your deployment settings.')

  const credentials = Buffer.from(`${settings.clientId}:${settings.clientSecret}`).toString('base64')
  const response = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(settings.accountId)}`, {
    method: 'POST',
    headers: { Authorization: `Basic ${credentials}` },
    cache: 'no-store',
  })
  if (!response.ok) throw new Error('Zoom could not authenticate this account. Check the Server-to-Server OAuth credentials.')
  const body = await response.json() as { access_token?: string }
  if (!body.access_token) throw new Error('Zoom did not return an access token.')
  return body.access_token
}

async function zoomFetch(path: string, init: RequestInit = {}) {
  const token = await accessToken()
  const response = await fetch(`https://api.zoom.us/v2${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
    cache: 'no-store',
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Zoom request failed: ${body || response.statusText}`)
  }
  return response
}

export async function createZoomMeeting(input: {
  topic: string
  scheduledFor: string
  durationMinutes: number
}) {
  const settings = config()
  if (!settings) throw new Error('Zoom is not connected yet. Add the Zoom server credentials in your deployment settings.')
  const response = await zoomFetch(`/users/${encodeURIComponent(settings.hostUserId)}/meetings`, {
    method: 'POST',
    body: JSON.stringify({
      topic: input.topic,
      type: 2,
      start_time: input.scheduledFor,
      duration: input.durationMinutes,
      timezone: 'Australia/Brisbane',
      settings: {
        join_before_host: false,
        waiting_room: true,
      },
    }),
  })
  return await response.json() as ZoomMeeting
}

export async function getZoomParticipants(meetingId: string) {
  const response = await zoomFetch(`/report/meetings/${encodeURIComponent(meetingId)}/participants?page_size=300`)
  const body = await response.json() as { participants?: ZoomParticipant[] }
  return body.participants ?? []
}

export async function getZoomMeetingStartUrl(meetingId: string) {
  const response = await zoomFetch(`/meetings/${encodeURIComponent(meetingId)}`)
  const body = await response.json() as { start_url?: string }
  if (!body.start_url) throw new Error('Zoom did not return a host link for this meeting.')
  return body.start_url
}

export async function deleteZoomMeeting(meetingId: string) {
  const token = await accessToken()
  const response = await fetch(`https://api.zoom.us/v2/meetings/${encodeURIComponent(meetingId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!response.ok && response.status !== 404) {
    const body = await response.text()
    throw new Error(`Zoom request failed: ${body || response.statusText}`)
  }
}
