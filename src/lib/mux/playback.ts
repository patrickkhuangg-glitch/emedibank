import 'server-only'
import { getMux } from './client'
import { getMuxSigningKeyId, getMuxSigningKeyPrivate } from './env'

/** Short-lived signed token for a Mux playback id (video type). */
export async function createPlaybackToken(playbackId: string): Promise<string> {
  return getMux().jwt.signPlaybackId(playbackId, {
    keyId: getMuxSigningKeyId(),
    keySecret: getMuxSigningKeyPrivate(),
    expiration: '2h',
    type: 'video',
  })
}
