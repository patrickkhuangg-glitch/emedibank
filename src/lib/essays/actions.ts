'use server'
import { requireUser, requireAdmin } from '@/lib/auth/dal'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { canAccessSubtest } from '@/lib/access'
import { countWords, parseQuotes, MARK_COST } from './config'
import { MARKING_SYSTEM, SECONDARY_MARKING_SYSTEM, RUBRIC_VERSION, buildMarkingUserMessage } from './marking-rubric'

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
  plan?: string | null,
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
        ...(plan !== undefined ? { plan } : {}),
      })
      .eq('id', responseId)
      .eq('status', 'draft') // never overwrite a submitted essay
    return { ok: true, savedAt }
  } catch {
    return { ok: false, savedAt: '' }
  }
}

/** Begin a full Section II simulation: create a shared sitting with two timed
 *  draft essays (one Task A, one Task B) under a single clock. */
export async function startSittingAction(
  taskAPromptId: string,
  taskBPromptId: string,
  minutes: number,
): Promise<{ sittingId: string; aId: string; bId: string } | Denied> {
  const user = await requireUser()
  const admin = createAdminClient()
  const { data: prompts } = await admin
    .from('essay_prompts')
    .select('id, subtest_id, published')
    .in('id', [taskAPromptId, taskBPromptId])
  if (!prompts || prompts.length !== 2 || prompts.some((p) => !p.published)) return { denied: true }
  if (!(await canAccessSubtest(user.id, prompts[0].subtest_id))) return { denied: true }

  const sittingId = crypto.randomUUID()
  const supabase = await createClient()
  const base = { user_id: user.id, body: '', word_count: 0, timed: true, duration_minutes: minutes, time_spent_seconds: 0, status: 'draft', sitting_id: sittingId }
  const { data, error } = await supabase
    .from('essay_responses')
    .insert([{ ...base, prompt_id: taskAPromptId }, { ...base, prompt_id: taskBPromptId }])
    .select('id, prompt_id')
  if (error || !data || data.length !== 2) return { denied: true }
  const aId = data.find((r) => r.prompt_id === taskAPromptId)!.id
  const bId = data.find((r) => r.prompt_id === taskBPromptId)!.id
  return { sittingId, aId, bId }
}

/** Finalise the essay. After this the row is read-only in the writer. When
 *  `forMarking` is set, also spend credits and enter the tutor-marking queue. */
export async function submitEssayAction(
  responseId: string,
  body: string,
  timeSpentSeconds: number,
  forMarking = false,
  plan?: string | null,
): Promise<{ ok: boolean; marked: boolean; reason?: 'no_credits' | 'already' | 'empty' | 'save_failed' }> {
  try {
    const user = await requireUser()
    const supabase = await createClient()
    const { data: existing, error: loadError } = await supabase
      .from('essay_responses')
      .select('body, status')
      .eq('id', responseId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (loadError || !existing || existing.status !== 'draft') return { ok: false, marked: false, reason: 'save_failed' }

    // Prefer the editor's current value. If a client event arrives with a stale
    // empty value, recover the latest autosaved draft rather than erasing it.
    const finalBody = body.trim() ? body : existing.body
    if (!finalBody.trim()) return { ok: false, marked: false, reason: 'empty' }

    const { data: saved, error: saveError } = await supabase
      .from('essay_responses')
      .update({
        body: finalBody,
        word_count: countWords(finalBody),
        time_spent_seconds: Math.max(0, Math.round(timeSpentSeconds)),
        status: 'submitted',
        updated_at: new Date().toISOString(),
        ...(plan !== undefined ? { plan } : {}),
      })
      .eq('id', responseId)
      .eq('user_id', user.id)
      .eq('status', 'draft')
      .select('id')
      .maybeSingle()
    if (saveError || !saved) return { ok: false, marked: false, reason: 'save_failed' }
    if (!forMarking) return { ok: true, marked: false }
    const r = await requestMarkingFor(user.id, responseId)
    return { ok: true, marked: r.marked, reason: r.reason }
  } catch {
    return { ok: false, marked: false }
  }
}

/** Request tutor marking for an already-submitted essay (from the essays list). */
export async function requestMarkingAction(
  responseId: string,
): Promise<{ ok: boolean; marked: boolean; reason?: 'no_credits' | 'already' | 'empty' }> {
  try {
    const user = await requireUser()
    const r = await requestMarkingFor(user.id, responseId)
    return { ok: true, marked: r.marked, reason: r.reason }
  } catch {
    return { ok: false, marked: false }
  }
}

/** Spend credits and enter the marking queue. Anchored in essay_markings (admin-
 *  only), so a request cannot be forged, and credits are debited atomically. */
async function requestMarkingFor(
  userId: string,
  responseId: string,
): Promise<{ marked: boolean; reason?: 'no_credits' | 'already' | 'empty' }> {
  const admin = createAdminClient()
  const { data: resp } = await admin
    .from('essay_responses').select('user_id, marking_status, body').eq('id', responseId).maybeSingle()
  if (!resp || resp.user_id !== userId) return { marked: false, reason: 'already' }
  if (resp.marking_status === 'pending' || resp.marking_status === 'approved') return { marked: false, reason: 'already' }
  if (!resp.body.trim()) return { marked: false, reason: 'empty' }

  // Atomic debit as the calling user (auth.uid() inside the function).
  const supabase = await createClient()
  const { data: ok } = await supabase.rpc('spend_essay_credits', { p_amount: MARK_COST })
  if (!ok) return { marked: false, reason: 'no_credits' }

  const now = new Date().toISOString()
  // Submitting for marking FINALISES the essay: it becomes submitted (locked, no
  // more editing) at the same time it enters the queue.
  await admin.from('essay_responses').update({
    status: 'submitted', marking_status: 'pending', submitted_for_marking_at: now, credits_spent: MARK_COST, updated_at: now,
  }).eq('id', responseId)
  await admin.from('essay_markings').upsert(
    { response_id: responseId, status: 'pending', updated_at: now },
    { onConflict: 'response_id' },
  )
  return { marked: true }
}

// ── Admin marking pipeline ───────────────────────────────────────────────────

/** Generate the AI first-draft feedback for an essay (admin-only). Returns a
 *  friendly reason when the API key isn't configured, so the queue still works
 *  with manual feedback. */
export async function generateAiDraftAction(
  responseId: string,
): Promise<{ ok: boolean; text?: string; secondaryText?: string | null; reason?: 'no_key' | 'error' }> {
  await requireAdmin()
  const openAiKey = process.env.OPENAI_ESSAY_MARKING_API_KEY || process.env.OPENAI_API_KEY
  if (!openAiKey) return { ok: false, reason: 'no_key' }
  const admin = createAdminClient()
  const { data: r } = await admin
    .from('essay_responses').select('body, prompt_id').eq('id', responseId).maybeSingle()
  if (!r) return { ok: false, reason: 'error' }
  const { data: p } = await admin
    .from('essay_prompts').select('task, theme, quotes').eq('id', r.prompt_id).maybeSingle()
  if (!p) return { ok: false, reason: 'error' }

  try {
    const userMessage = buildMarkingUserMessage({ task: p.task, theme: p.theme, quotes: parseQuotes(p.quotes), body: r.body })
    const primaryModel = process.env.OPENAI_ESSAY_MARKING_MODEL || process.env.OPENAI_MARKING_MODEL || 'gpt-5.6-terra'
    const secondaryModel = process.env.ANTHROPIC_ESSAY_COMARKER_MODEL || process.env.ANTHROPIC_COMARKER_MODEL || 'claude-sonnet-5'

    const primaryRequest = fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${openAiKey}` },
      body: JSON.stringify({
        model: primaryModel,
        max_output_tokens: 3200,
        input: [
          { role: 'system', content: MARKING_SYSTEM },
          { role: 'user', content: userMessage },
        ],
      }),
    })

    const anthropicKey = process.env.ANTHROPIC_ESSAY_COMARKER_API_KEY || process.env.ANTHROPIC_API_KEY
    const secondaryRequest = anthropicKey
      ? fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({
            model: secondaryModel,
            max_tokens: 700,
            system: SECONDARY_MARKING_SYSTEM,
            messages: [{ role: 'user', content: userMessage }],
          }),
        })
      : Promise.resolve(null)

    const [primaryRes, secondaryRes] = await Promise.all([primaryRequest, secondaryRequest])
    if (!primaryRes.ok) return { ok: false, reason: 'error' }
    const primaryJson = await primaryRes.json()
    const text: string = extractOpenAiText(primaryJson)
    if (!text) return { ok: false, reason: 'error' }

    let secondaryText: string | null = null
    if (secondaryRes?.ok) {
      const secondaryJson = await secondaryRes.json()
      secondaryText = (secondaryJson?.content ?? [])
        .filter((b: { type: string }) => b.type === 'text')
        .map((b: { text: string }) => b.text)
        .join('\n')
        .trim() || null
    }
    const now = new Date().toISOString()
    // Store the AI draft; seed the tutor's working copy if they haven't started one.
    const { data: existing } = await admin.from('essay_markings').select('draft_feedback').eq('response_id', responseId).maybeSingle()
    await admin.from('essay_markings').upsert({
      response_id: responseId,
      ai_feedback: text,
      primary_provider: 'openai',
      primary_model: primaryModel,
      secondary_feedback: secondaryText,
      secondary_provider: secondaryText ? 'anthropic' : null,
      secondary_model: secondaryText ? secondaryModel : null,
      rubric_version: RUBRIC_VERSION,
      draft_feedback: existing?.draft_feedback ?? text,
      status: 'pending',
      updated_at: now,
    }, { onConflict: 'response_id' })
    return { ok: true, text, secondaryText }
  } catch {
    return { ok: false, reason: 'error' }
  }
}

function extractOpenAiText(json: {
  output_text?: string
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>
}): string {
  if (typeof json.output_text === 'string') return json.output_text.trim()
  return (json.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((item) => item.type === 'output_text' || item.type === 'text')
    .map((item) => item.text ?? '')
    .join('\n')
    .trim()
}

/** Save the tutor's in-progress edit of the feedback (admin-only). */
export async function saveMarkingDraftAction(responseId: string, draft: string): Promise<{ ok: boolean }> {
  try {
    await requireAdmin()
    const admin = createAdminClient()
    await admin.from('essay_markings').upsert(
      { response_id: responseId, draft_feedback: draft, updated_at: new Date().toISOString() },
      { onConflict: 'response_id' },
    )
    return { ok: true }
  } catch {
    return { ok: false }
  }
}

/** Approve and release feedback to the student (admin-only). */
export async function approveMarkingAction(responseId: string, feedback: string): Promise<{ ok: boolean }> {
  try {
    const admin_profile = await requireAdmin()
    const admin = createAdminClient()
    const now = new Date().toISOString()
    await admin.from('essay_markings').upsert(
      { response_id: responseId, draft_feedback: feedback, status: 'approved', marked_by: admin_profile.id, updated_at: now },
      { onConflict: 'response_id' },
    )
    await admin.from('essay_responses').update({
      marking_status: 'approved', tutor_feedback: feedback, marked_at: now, updated_at: now,
    }).eq('id', responseId)
    return { ok: true }
  } catch {
    return { ok: false }
  }
}

/** Grant essay-marking credits to a user by email (admin-only). */
export async function topUpCreditsAction(email: string, amount: number): Promise<{ ok: boolean; balance?: number; error?: string }> {
  try {
    await requireAdmin()
    const n = Math.round(amount)
    if (!Number.isFinite(n) || n <= 0) return { ok: false, error: 'Enter a positive number of credits.' }
    const admin = createAdminClient()
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const target = (list?.users ?? []).find((u) => u.email?.toLowerCase() === email.trim().toLowerCase())
    if (!target) return { ok: false, error: `No user found with email ${email}.` }
    const { data: prof } = await admin.from('profiles').select('essay_credits').eq('id', target.id).maybeSingle()
    const balance = (prof?.essay_credits ?? 0) + n
    await admin.from('profiles').update({ essay_credits: balance }).eq('id', target.id)
    return { ok: true, balance }
  } catch {
    return { ok: false, error: 'Something went wrong.' }
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
