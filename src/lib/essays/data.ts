import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/auth/dal'
import { parseQuotes, type EssayQuote } from './config'

export type EssayPromptView = {
  id: string
  task: string
  theme: string
  instructions: string
  quotes: EssayQuote[]
  suggestedMinutes: number
}

export type MarkingStatus = 'none' | 'pending' | 'approved'

export type EssayResponseView = {
  id: string
  promptId: string
  theme: string
  task: string
  body: string
  plan: string | null
  wordCount: number
  timed: boolean
  durationMinutes: number | null
  timeSpentSeconds: number
  status: 'draft' | 'submitted'
  markingStatus: MarkingStatus
  tutorFeedback: string | null
  creditsSpent: number
  sittingId: string | null
  updatedAt: string
}

const RESPONSE_COLS =
  'id, prompt_id, body, plan, word_count, timed, duration_minutes, time_spent_seconds, status, marking_status, tutor_feedback, credits_spent, sitting_id, updated_at, essay_prompts(theme, task)'

function toMarkingStatus(v: unknown): MarkingStatus {
  return v === 'pending' || v === 'approved' ? v : 'none'
}

function toResponseView(r: {
  id: string; prompt_id: string; body: string; plan: string | null; word_count: number; timed: boolean
  duration_minutes: number | null; time_spent_seconds: number; status: string
  marking_status: string | null; tutor_feedback: string | null; credits_spent: number
  sitting_id: string | null; updated_at: string
  essay_prompts?: { theme: string; task: string } | null
}): EssayResponseView {
  const p = r.essay_prompts
  return {
    id: r.id,
    promptId: r.prompt_id,
    theme: p?.theme ?? 'Essay',
    task: p?.task ?? 'A',
    body: r.body,
    plan: r.plan,
    wordCount: r.word_count,
    timed: r.timed,
    durationMinutes: r.duration_minutes,
    timeSpentSeconds: r.time_spent_seconds,
    status: r.status === 'submitted' ? 'submitted' : 'draft',
    markingStatus: toMarkingStatus(r.marking_status),
    tutorFeedback: r.tutor_feedback,
    creditsSpent: r.credits_spent,
    sittingId: r.sitting_id,
    updatedAt: r.updated_at,
  }
}

function toPromptView(row: {
  id: string; task: string; theme: string; instructions: string
  quotes: unknown; suggested_minutes: number
}): EssayPromptView {
  return {
    id: row.id,
    task: row.task,
    theme: row.theme,
    instructions: row.instructions,
    quotes: parseQuotes(row.quotes),
    suggestedMinutes: row.suggested_minutes,
  }
}

/** Published prompts for an essay section, in author order. */
export async function getEssayPrompts(subtestId: string): Promise<EssayPromptView[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('essay_prompts')
    .select('id, task, theme, instructions, quotes, suggested_minutes')
    .eq('subtest_id', subtestId)
    .eq('published', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  return (data ?? []).map(toPromptView)
}

/** One published prompt by id (or null). */
export async function getEssayPrompt(promptId: string): Promise<EssayPromptView | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('essay_prompts')
    .select('id, task, theme, instructions, quotes, suggested_minutes')
    .eq('id', promptId)
    .eq('published', true)
    .maybeSingle()
  return data ? toPromptView(data) : null
}

/** The signed-in user's saved essays for a set of prompts (RLS scopes to own rows). */
export async function getEssayResponses(promptIds: string[]): Promise<EssayResponseView[]> {
  if (promptIds.length === 0) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('essay_responses')
    .select(RESPONSE_COLS)
    .in('prompt_id', promptIds)
    .order('updated_at', { ascending: false })
  return (data ?? []).map((r) => toResponseView(r as Parameters<typeof toResponseView>[0]))
}

/** Both essays of a simulation sitting, oldest first (RLS scopes to own rows). */
export async function getSittingResponses(sittingId: string): Promise<EssayResponseView[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('essay_responses')
    .select(RESPONSE_COLS)
    .eq('sitting_id', sittingId)
    .order('created_at', { ascending: true })
  return (data ?? []).map((r) => toResponseView(r as Parameters<typeof toResponseView>[0]))
}

/** A single response owned by the current user (for resume / review). */
export async function getEssayResponse(responseId: string): Promise<EssayResponseView | null> {
  const supabase = await createClient()
  const { data: r } = await supabase
    .from('essay_responses')
    .select(RESPONSE_COLS)
    .eq('id', responseId)
    .maybeSingle()
  return r ? toResponseView(r as Parameters<typeof toResponseView>[0]) : null
}

/** The current user's essay-marking credit balance. */
export async function getEssayCredits(): Promise<number> {
  const user = await requireUser()
  const supabase = await createClient()
  const { data } = await supabase.from('profiles').select('essay_credits').eq('id', user.id).maybeSingle()
  return data?.essay_credits ?? 0
}

/** A random published prompt of a given task ('A' | 'B') — for a concealed-topic sitting. */
export async function getRandomPromptByTask(subtestId: string, task: string): Promise<EssayPromptView | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('essay_prompts')
    .select('id, task, theme, instructions, quotes, suggested_minutes')
    .eq('subtest_id', subtestId)
    .eq('task', task)
    .eq('published', true)
  const rows = data ?? []
  if (rows.length === 0) return null
  return toPromptView(rows[Math.floor(Math.random() * rows.length)])
}

// ── Admin: marking queue ─────────────────────────────────────────────────────

export type MarkingQueueItem = {
  responseId: string
  theme: string
  task: string
  wordCount: number
  timed: boolean
  submittedAt: string | null
  hasAiDraft: boolean
  studentName: string | null
}

/** Essays awaiting tutor marking, oldest first. Admin-only (service-role read). */
export async function getPendingMarkings(): Promise<MarkingQueueItem[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('essay_responses')
    .select('id, word_count, timed, submitted_for_marking_at, user_id, essay_prompts(theme, task), essay_markings(ai_feedback)')
    .eq('marking_status', 'pending')
    .order('submitted_for_marking_at', { ascending: true })
  const rows = (data ?? []) as Array<{
    id: string; word_count: number; timed: boolean; submitted_for_marking_at: string | null; user_id: string
    essay_prompts?: { theme: string; task: string } | null
    essay_markings?: { ai_feedback: string | null } | { ai_feedback: string | null }[] | null
  }>
  // Resolve student names in one pass.
  const ids = [...new Set(rows.map((r) => r.user_id))]
  const names = new Map<string, string | null>()
  if (ids.length) {
    const { data: profs } = await admin.from('profiles').select('id, full_name').in('id', ids)
    for (const p of profs ?? []) names.set(p.id, p.full_name)
  }
  return rows.map((r) => {
    const m = Array.isArray(r.essay_markings) ? r.essay_markings[0] : r.essay_markings
    return {
      responseId: r.id,
      theme: r.essay_prompts?.theme ?? 'Essay',
      task: r.essay_prompts?.task ?? 'A',
      wordCount: r.word_count,
      timed: r.timed,
      submittedAt: r.submitted_for_marking_at,
      hasAiDraft: !!m?.ai_feedback,
      studentName: names.get(r.user_id) ?? null,
    }
  })
}

export type MarkingDetail = {
  responseId: string
  status: 'pending' | 'approved' | 'none'
  prompt: EssayPromptView
  body: string
  plan: string | null
  wordCount: number
  timed: boolean
  durationMinutes: number | null
  aiFeedback: string | null
  draftFeedback: string | null
  tutorFeedback: string | null
  studentName: string | null
  submittedAt: string | null
}

/** Full detail for one essay in the marking queue. Admin-only (service-role read). */
export async function getMarkingDetail(responseId: string): Promise<MarkingDetail | null> {
  const admin = createAdminClient()
  const { data: r } = await admin
    .from('essay_responses')
    .select('id, prompt_id, body, plan, word_count, timed, duration_minutes, marking_status, tutor_feedback, submitted_for_marking_at, user_id')
    .eq('id', responseId)
    .maybeSingle()
  if (!r) return null
  const { data: p } = await admin
    .from('essay_prompts')
    .select('id, task, theme, instructions, quotes, suggested_minutes')
    .eq('id', r.prompt_id).maybeSingle()
  if (!p) return null
  const { data: m } = await admin
    .from('essay_markings').select('ai_feedback, draft_feedback, status').eq('response_id', responseId).maybeSingle()
  const { data: prof } = await admin.from('profiles').select('full_name').eq('id', r.user_id).maybeSingle()
  return {
    responseId: r.id,
    status: toMarkingStatus(r.marking_status),
    prompt: toPromptView(p),
    body: r.body,
    plan: r.plan,
    wordCount: r.word_count,
    timed: r.timed,
    durationMinutes: r.duration_minutes,
    aiFeedback: m?.ai_feedback ?? null,
    draftFeedback: m?.draft_feedback ?? null,
    tutorFeedback: r.tutor_feedback,
    studentName: prof?.full_name ?? null,
    submittedAt: r.submitted_for_marking_at,
  }
}
