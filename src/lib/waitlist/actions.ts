'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export type WaitlistState = { status: 'idle' | 'success' | 'error'; message: string }
export const INITIAL_WAITLIST_STATE: WaitlistState = { status: 'idle', message: '' }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function joinLaunchWaitlist(_previous: WaitlistState, formData: FormData): Promise<WaitlistState> {
  // A hidden field that real users never fill. Return a neutral success response
  // so basic bots cannot use the endpoint to probe validation behaviour.
  if (String(formData.get('website') ?? '')) return { status: 'success', message: 'You are on the opening list.' }

  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  if (email.length > 254 || !EMAIL.test(email)) return { status: 'error', message: 'Enter a valid email address.' }

  const { error } = await createAdminClient().from('launch_waitlist').insert({ email, source: 'landing_page' })
  if (error && error.code !== '23505') {
    console.error('Waitlist signup failed:', error.code)
    return { status: 'error', message: 'We could not save your email. Please try again.' }
  }
  return { status: 'success', message: 'You are on the opening list. We will email you when Studocyte opens.' }
}

