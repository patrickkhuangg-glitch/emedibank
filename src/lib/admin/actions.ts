'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/dal'

/** Toggle a subtest's free flag. Admin-only (also enforced by RLS). */
export async function setSubtestFreeAction(formData: FormData) {
  await requireAdmin()

  const subtestId = String(formData.get('subtestId') ?? '')
  const isFree = String(formData.get('isFree') ?? '') === 'true'

  const supabase = await createClient()
  const { error } = await supabase
    .from('subtests')
    .update({ is_free: isFree })
    .eq('id', subtestId)
  if (error) throw error

  revalidatePath('/admin')
  revalidatePath('/admin/access')
}
