import 'server-only'
import Mux from '@mux/mux-node'
import { getMuxTokenId, getMuxTokenSecret } from './env'

let client: Mux | null = null
export function getMux(): Mux {
  if (!client) {
    client = new Mux({ tokenId: getMuxTokenId(), tokenSecret: getMuxTokenSecret() })
  }
  return client
}
