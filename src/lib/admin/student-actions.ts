'use server'

import { revalidatePath } from 'next/cache'
import { getProfile } from '@/lib/auth/dal'
import { getOrigin } from '@/lib/site'
import { createAdminClient } from '@/lib/supabase/admin'

export type InviteStudentState = { error?: string; message?: string }

export async function inviteStudentAction(_previous: InviteStudentState, formData: FormData): Promise<InviteStudentState> {
  const profile = await getProfile()
  if (profile?.role !== 'admin') return { error: 'Only admins can create student accounts.' }

  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const fullName = String(formData.get('fullName') ?? '').trim()
  if (!email || !email.includes('@')) return { error: 'Enter a valid student email address.' }

  const origin = await getOrigin()
  const { error } = await createAdminClient().auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName || undefined },
    redirectTo: `${origin}/auth/confirm?next=/update-password`,
  })
  if (error) {
    if (error.message.toLowerCase().includes('already')) return { error: 'That email already has a Studocyte account.' }
    return { error: error.message }
  }

  revalidatePath('/admin/students')
  revalidatePath('/admin/study-plans')
  return { message: `Invite sent to ${email}. They will choose their own password.` }
}
