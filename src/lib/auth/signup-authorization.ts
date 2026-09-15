import 'server-only'
import { createHash, randomBytes } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'

// Call only after CAPTCHA/rate-limit verification or an administrator role check.
export async function authorizeSignup(email: string): Promise<string | null> {
  const token = randomBytes(32).toString('hex')
  const { error } = await createAdminClient().rpc('authorize_signup', {
    p_email: email,
    p_token_hash: createHash('sha256').update(token).digest('hex'),
  })
  if (error) {
    console.error('Signup authorization could not be issued.')
    return null
  }
  return token
}
