'use server'

import { revalidatePath } from 'next/cache'
import { getProfile } from '@/lib/auth/dal'
import { normalisePhone } from '@/lib/auth/signup-protection'
import { getOrigin } from '@/lib/site'
import { createAdminClient } from '@/lib/supabase/admin'

export type InviteStudentState = { error?: string; message?: string }
export type SendAccountAccessState = { error?: string; message?: string }

export async function inviteStudentAction(_previous: InviteStudentState, formData: FormData): Promise<InviteStudentState> {
  const profile = await getProfile()
  if (profile?.role !== 'admin') return { error: 'Only admins can create student accounts.' }

  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const fullName = String(formData.get('fullName') ?? '').trim()
  const phoneNumber = normalisePhone(String(formData.get('phoneNumber') ?? ''))
  const accountRole = String(formData.get('accountRole') ?? 'student') === 'tutor' ? 'tutor' : 'student'
  if (!email || !email.includes('@')) return { error: 'Enter a valid email address.' }
  if (fullName.length < 2) return { error: 'Enter the account holder’s full name.' }
  if (!phoneNumber) return { error: 'Enter a valid mobile number. Use an Australian 04 number or international + format.' }

  const admin = createAdminClient()
  const { data: existingPhone } = await admin
    .from('profiles')
    .select('id')
    .eq('phone_number', phoneNumber)
    .maybeSingle()
  if (existingPhone) return { error: 'That mobile number is already linked to another account.' }

  const origin = await getOrigin()
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName, phone_number: phoneNumber },
    redirectTo: `${origin}/auth/confirm?next=/update-password`,
  })
  if (error) {
    if (error.message.toLowerCase().includes('already')) return { error: 'That email already has a Studocyte account.' }
    return { error: error.message }
  }

  if (data.user && accountRole === 'tutor') {
    const { error: roleError } = await admin.from('profiles').update({ role: 'tutor' }).eq('id', data.user.id)
    if (roleError) return { error: 'The account was invited, but its tutor access could not be set. Update the role before they sign in.' }
  }

  revalidatePath('/admin/students')
  revalidatePath('/admin/study-plans')
  return { message: `${accountRole === 'tutor' ? 'Tutor' : 'Student'} invite sent to ${email}. They will choose their own password.` }
}

export async function sendAccountAccessAction(_previous: SendAccountAccessState, formData: FormData): Promise<SendAccountAccessState> {
  const requestingProfile = await getProfile()
  if (requestingProfile?.role !== 'admin') return { error: 'Only admins can send account access emails.' }

  const userId = String(formData.get('userId') ?? '').trim()
  const requestedEmail = String(formData.get('email') ?? '').trim().toLowerCase()
  const delivery = String(formData.get('delivery') ?? '')
  if (!userId || !requestedEmail || !['login', 'password'].includes(delivery)) return { error: 'Check the account and try again.' }

  const admin = createAdminClient()
  const [{ data: userResult, error: userError }, { data: targetProfile }] = await Promise.all([
    admin.auth.admin.getUserById(userId),
    admin.from('profiles').select('role').eq('id', userId).maybeSingle(),
  ])
  const account = userResult?.user
  if (userError || !account || account.email?.toLowerCase() !== requestedEmail) return { error: 'That account could not be verified. Refresh and try again.' }
  if (targetProfile?.role === 'admin') return { error: 'Admin access emails are managed from the Account page.' }

  const origin = await getOrigin()
  const next = targetProfile?.role === 'tutor' ? '/bookings' : '/dashboard'
  const { error } = delivery === 'login'
    ? await admin.auth.signInWithOtp({ email: requestedEmail, options: { shouldCreateUser: false, emailRedirectTo: `${origin}/auth/confirm?next=${next}` } })
    : await admin.auth.resetPasswordForEmail(requestedEmail, { redirectTo: `${origin}/auth/confirm?next=/update-password` })

  if (error) {
    console.error('Could not send account access email.', error)
    if (error.message.toLowerCase().includes('rate')) return { error: 'Too many emails were requested. Wait a few minutes and try again.' }
    return { error: 'The email could not be sent. Check the address and try again.' }
  }

  return { message: delivery === 'login' ? `Secure sign-in link sent to ${requestedEmail}.` : `Password setup link sent to ${requestedEmail}.` }
}
