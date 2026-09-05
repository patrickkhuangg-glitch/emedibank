'use server'

import { revalidatePath } from 'next/cache'
import { getProfile } from '@/lib/auth/dal'
import { normalisePhone } from '@/lib/auth/signup-protection'
import { getOrigin } from '@/lib/site'
import { createAdminClient } from '@/lib/supabase/admin'

export type InviteStudentState = { error?: string; message?: string }

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
