'use server'
import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/dal'
import { createClient } from '@/lib/supabase/server'
import type { InterfaceMode } from '@/lib/supabase/types'

/** Save the signed-in user's interface style. Own-row RLS scopes the write; the
 *  interface_mode column grant (migration 0010) permits it. Best-effort: returns
 *  ok:false rather than throwing if the column isn't there yet. */
export async function updateInterfaceModeAction(mode: InterfaceMode): Promise<{ ok: boolean }> {
  if (mode !== 'playful' && mode !== 'clean') return { ok: false }
  const user = await requireUser()
  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ interface_mode: mode })
    .eq('id', user.id)
  if (error) return { ok: false }
  // Refresh the chrome everywhere so the mark swaps immediately.
  revalidatePath('/', 'layout')
  return { ok: true }
}
