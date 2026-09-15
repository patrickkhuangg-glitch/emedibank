'use server'

import { revalidatePath } from 'next/cache'
import { getProfile } from '@/lib/auth/dal'
import { createAdminClient } from '@/lib/supabase/admin'

export type MarkingCreditState = { error?: string; message?: string }

export async function addMarkingCreditsAction(_previous: MarkingCreditState, formData: FormData): Promise<MarkingCreditState> {
  const actor = await getProfile()
  if (actor?.role !== 'admin') return { error: 'Only admins can add marking credits.' }
  const userId = String(formData.get('userId') ?? '')
  const requestId = String(formData.get('requestId') ?? '')
  const essay = String(formData.get('essayAmount') ?? '').trim()
  const interview = String(formData.get('interviewAmount') ?? '').trim()
  const note = String(formData.get('note') ?? '').trim()
  const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
  if (!uuid.test(userId) || !uuid.test(requestId)) return { error: 'This request could not be identified. Refresh and try again.' }
  if (![essay, interview].every(value => /^\d{1,5}$/.test(value) && Number(value) <= 10000) || Number(essay) + Number(interview) === 0) {
    return { error: 'Enter whole numbers from 0 to 10,000, with at least one credit to add.' }
  }
  if (note.length > 500) return { error: 'Keep the note to 500 characters or fewer.' }
  const { data, error } = await createAdminClient().rpc('add_admin_marking_credits', {
    p_request_id: requestId, p_actor_id: actor.id, p_user_id: userId,
    p_essay_amount: Number(essay), p_interview_amount: Number(interview), p_note: note,
  })
  if (error || !data) return { error: 'Credits could not be confirmed. Retry this entry safely; the same request will only be added once.' }
  if (data.status === 'student_unavailable') return { error: 'That student account is no longer available. Refresh the student list.' }
  if (data.status === 'request_conflict') return { error: 'This request has already been used for a different entry. Refresh before adding more credits.' }
  if (!['added', 'already_applied'].includes(data.status)) return { error: 'Credits could not be confirmed. Please retry this entry.' }
  for (const path of ['/admin/students', '/account', '/dashboard', '/interviews', '/interviews/mock-interviews', '/interviews/review']) revalidatePath(path)
  const amounts = [Number(essay) ? `${Number(essay)} essay marking` : '', Number(interview) ? `${Number(interview)} interview marking` : ''].filter(Boolean).join(' and ')
  return { message: data.status === 'already_applied' ? 'This entry was already added. No extra credits were added.' : `Added ${amounts} credits.` }
}
