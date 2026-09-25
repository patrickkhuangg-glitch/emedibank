import 'server-only'

import { createHash, randomBytes } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'

/** Metadata key the require_signup_authorization trigger (0035/0047) reads. */
export const SIGNUP_TICKET_KEY = 'signup_authorization'

/** Issue a single-use, 10-minute signup ticket for an email. Only the server can
 *  mint one (authorize_signup is service-role only), so once the trigger is
 *  active an email account can only be created through the app's protected
 *  signup or an admin invite — not by calling Supabase Auth directly. */
export async function issueSignupTicket(email: string): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const { error } = await createAdminClient().rpc('authorize_signup', {
    p_email: email,
    p_token_hash: createHash('sha256').update(token, 'utf8').digest('hex'),
  })
  if (error) throw error
  return token
}
