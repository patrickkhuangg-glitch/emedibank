'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getOrigin } from '@/lib/site'
import { normalisePhone, verifySignupProtection } from '@/lib/auth/signup-protection'

export type AuthState = { error?: string; message?: string }

export async function signInAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const redirectTo = String(formData.get('redirectTo') ?? '') || '/dashboard'

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: error.message }

  redirect(redirectTo)
}

export async function signUpAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const fullName = String(formData.get('full_name') ?? '').trim()
  const phoneNumber = normalisePhone(String(formData.get('phone_number') ?? ''))
  const turnstileToken = String(formData.get('turnstileToken') ?? '')

  if (fullName.length < 2) return { error: 'Enter your full name.' }
  if (!phoneNumber) return { error: 'Enter a valid mobile number. Use an Australian 04 number or international + format.' }
  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.' }
  }
  const protection = await verifySignupProtection(email, turnstileToken)
  if (protection.error) return { error: protection.error }

  const origin = await getOrigin()
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, phone_number: phoneNumber },
      emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent('/pricing?signup=success')}`,
    },
  })
  if (error) return { error: error.message }

  // If email confirmation is on, there's no session yet.
  if (!data.session) {
    return { message: 'Check your email to verify your account, then choose a plan and start your trial.' }
  }
  redirect('/pricing?signup=success')
}

export async function updateProfileAction(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const fullName = String(formData.get('full_name') ?? '').trim()
  const phoneNumber = normalisePhone(String(formData.get('phone_number') ?? ''))
  if (fullName.length < 2) return { error: 'Enter your full name.' }
  if (!phoneNumber) return { error: 'Enter a valid mobile number. Use an Australian 04 number or international + format.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sign in to update your details.' }
  const { error } = await supabase.from('profiles').update({ full_name: fullName, phone_number: phoneNumber }).eq('id', user.id)
  if (error) return { error: error.message.includes('profiles_phone_number_unique') ? 'That mobile number is already linked to another account.' : 'Your details could not be saved. Please try again.' }
  revalidatePath('/account')
  return { message: 'Your details have been saved. You can now start a trial.' }
}

export async function signInWithGoogleAction(formData: FormData) {
  const redirectTo = String(formData.get('redirectTo') ?? '') || '/dashboard'
  const origin = await getOrigin()
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
    },
  })
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`)
  if (data.url) redirect(data.url)
}

export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}

export async function requestPasswordResetAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim()
  const origin = await getOrigin()
  const supabase = await createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/update-password`,
  })
  // Do not leak whether an account exists.
  if (error) return { error: error.message }
  return { message: 'If that email has an account, a reset link is on its way.' }
}

export async function updatePasswordAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const password = String(formData.get('password') ?? '')
  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.' }
  }
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { error: error.message }
  redirect('/account')
}
