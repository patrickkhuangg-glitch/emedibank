'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrigin } from '@/lib/site'

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

  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.' }
  }

  const origin = await getOrigin()
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent('/dashboard?signup=success')}`,
    },
  })
  if (error) return { error: error.message }

  // If email confirmation is on, there's no session yet.
  if (!data.session) {
    return { message: 'Check your email to confirm your account, then log in.' }
  }
  redirect('/dashboard?signup=success')
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
