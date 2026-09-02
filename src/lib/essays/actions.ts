'use server'
import { requireUser } from '@/lib/auth/dal'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { canAccessSubtest } from '@/lib/access'
import { countWords } from './config'

type Denied = { denied: true }

/** Begin a writing session: verify access, create a fresh draft row, return its id.
 *  Each session is its own row, so a student can keep both a timed and an untimed
 *  attempt of the same prompt. */
export async function startEssayAction(
  promptId: string,
  opts: { timed: boolean; minutes: number | null },
): Promise<{ id: string } | Denied> {
  const user = await requireUser()
  const admin = createAdminClient()

  // Load the prompt (admin read: existence + which section it belongs to).
  const { data: prompt } = await admin
    .from('essay_prompts')
    .select('id, subtest_id, published')
    .eq('id', promptId)
    .maybeSingle()
  if (!prompt || !prompt.published) return { denied: true }
  if (!(await canAccessSubtest(user.id, prompt.subtest_id))) return { denied: true }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('essay_responses')
    .insert({
      user_id: user.id,
      prompt_id: promptId,
      body: '',
      word_count: 0,
      timed: opts.timed,
      duration_minutes: opts.timed ? opts.minutes : null,
      time_spent_seconds: 0,
      status: 'draft',
    })
    .select('id')
    .single()
  if (error || !data) return { denied: true }
  return { id: data.id }
}

/** Autosave the draft. Best-effort: an update that touches someone else's row is
 *  blocked by RLS and simply no-ops. */
export async function saveEssayDraftAction(
  responseId: string,
  body: string,
  timeSpentSeconds: number,
): Promise<{ ok: boolean; savedAt: string }> {
  try {
    await requireUser()
    const supabase = await createClient()
    const savedAt = new Date().toISOString()
    await supabase
      .from('essay_responses')
      .update({
        body,
        word_count: countWords(body),
        time_spent_seconds: Math.max(0, Math.round(timeSpentSeconds)),
        updated_at: savedAt,
      })
      .eq('id', responseId)
      .eq('status', 'draft') // never overwrite a submitted essay
    return { ok: true, savedAt }
  } catch {
    return { ok: false, savedAt: '' }
  }
}

/** Finalise the essay. After this the row is read-only in the writer. */
export async function submitEssayAction(
  responseId: string,
  body: string,
  timeSpentSeconds: number,
): Promise<{ ok: boolean }> {
  try {
    await requireUser()
    const supabase = await createClient()
    await supabase
      .from('essay_responses')
      .update({
        body,
        word_count: countWords(body),
        time_spent_seconds: Math.max(0, Math.round(timeSpentSeconds)),
        status: 'submitted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', responseId)
    return { ok: true }
  } catch {
    return { ok: false }
  }
}

/** Delete one of the user's own essays (drafts or submitted). */
export async function deleteEssayAction(responseId: string): Promise<{ ok: boolean }> {
  try {
    await requireUser()
    const supabase = await createClient()
    await supabase.from('essay_responses').delete().eq('id', responseId)
    return { ok: true }
  } catch {
    return { ok: false }
  }
}
