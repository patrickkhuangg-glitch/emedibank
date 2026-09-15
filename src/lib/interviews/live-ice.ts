import 'server-only'

export type LiveIceServer = {
  urls: string | string[]
  username?: string
  credential?: string
}

const PUBLIC_STUN: LiveIceServer = {
  urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'],
}

function staticIceServers(env: Record<string, string | undefined>): LiveIceServer[] {
  const rawUrls = env.INTERVIEW_TURN_URLS?.trim()
  if (!rawUrls) return [PUBLIC_STUN]

  const urls = rawUrls.split(/[\s,]+/).filter(Boolean)
  const username = env.INTERVIEW_TURN_USERNAME?.trim()
  const credential = env.INTERVIEW_TURN_CREDENTIAL?.trim()
  if (!urls.length || urls.length > 8 || urls.some(url => !/^turns?:[^\s]+$/i.test(url))) {
    throw new Error('invalid_interview_turn_urls')
  }
  if (!username || !credential || username.length > 512 || credential.length > 1024) {
    throw new Error('invalid_interview_turn_credentials')
  }

  return [PUBLIC_STUN, { urls, username, credential }]
}

function providerIceServers(value: unknown): LiveIceServer[] {
  if (!value || typeof value !== 'object' || !Array.isArray((value as { iceServers?: unknown }).iceServers)) {
    throw new Error('invalid_interview_turn_provider_response')
  }
  const servers = (value as { iceServers: unknown[] }).iceServers.map(server => {
    if (!server || typeof server !== 'object') throw new Error('invalid_interview_turn_provider_response')
    const rawUrls = (server as { urls?: unknown }).urls
    const urls = typeof rawUrls === 'string' ? [rawUrls] : rawUrls
    if (!Array.isArray(urls) || !urls.length || urls.length > 8 || urls.some(url => typeof url !== 'string' || !/^(?:stun|turns?):[^\s]+$/i.test(url))) {
      throw new Error('invalid_interview_turn_provider_response')
    }
    const needsCredentials = urls.some(url => /^turns?:/i.test(url))
    const username = (server as { username?: unknown }).username
    const credential = (server as { credential?: unknown }).credential
    if (needsCredentials && (typeof username !== 'string' || !username || username.length > 512 || typeof credential !== 'string' || !credential || credential.length > 1024)) {
      throw new Error('invalid_interview_turn_provider_response')
    }
    return { urls, ...(typeof username === 'string' ? { username } : {}), ...(typeof credential === 'string' ? { credential } : {}) }
  })
  if (!servers.some(server => server.urls.some(url => /^turns?:/i.test(url)))) {
    throw new Error('invalid_interview_turn_provider_response')
  }
  return servers
}

export async function liveIceServers(
  env: Record<string, string | undefined> = process.env,
  request: typeof fetch = fetch,
): Promise<LiveIceServer[]> {
  const keyId = env.INTERVIEW_TURN_KEY_ID?.trim()
  const apiToken = env.INTERVIEW_TURN_API_TOKEN?.trim()
  if (!keyId && !apiToken) return staticIceServers(env)
  if (!keyId || !apiToken || !/^[a-f0-9]{32}$/i.test(keyId) || apiToken.length > 1024) {
    throw new Error('invalid_interview_turn_provider_configuration')
  }

  const response = await request(`https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate-ice-servers`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ttl: 7200 }),
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) {
    await response.body?.cancel()
    throw new Error('interview_turn_provider_unavailable')
  }
  return providerIceServers(await response.json())
}
