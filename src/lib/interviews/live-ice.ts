import 'server-only'

export type LiveIceServer = {
  urls: string | string[]
  username?: string
  credential?: string
}

const PUBLIC_STUN: LiveIceServer = {
  urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'],
}

export function liveIceServers(env: Record<string, string | undefined> = process.env): LiveIceServer[] {
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
