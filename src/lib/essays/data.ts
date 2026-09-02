import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { parseQuotes, type EssayQuote } from './config'

export type EssayPromptView = {
  id: string
  task: string
  theme: string
  instructions: string
  quotes: EssayQuote[]
  suggestedMinutes: number
}

export type EssayResponseView = {
  id: string
  promptId: string
  theme: string
  task: string
  body: string
  wordCount: number
  timed: boolean
  durationMinutes: number | null
  timeSpentSeconds: number
  status: 'draft' | 'submitted'
  updatedAt: string
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
    .select('id, prompt_id, body, word_count, timed, duration_minutes, time_spent_seconds, status, updated_at, essay_prompts(theme, task)')
    .in('prompt_id', promptIds)
    .order('updated_at', { ascending: false })
  return (data ?? []).map((r) => {
    const p = (r as { essay_prompts?: { theme: string; task: string } | null }).essay_prompts
    return {
      id: r.id,
      promptId: r.prompt_id,
      theme: p?.theme ?? 'Essay',
      task: p?.task ?? 'A',
      body: r.body,
      wordCount: r.word_count,
      timed: r.timed,
      durationMinutes: r.duration_minutes,
      timeSpentSeconds: r.time_spent_seconds,
      status: (r.status === 'submitted' ? 'submitted' : 'draft'),
      updatedAt: r.updated_at,
    }
  })
}

/** A single response owned by the current user (for resume / review). */
export async function getEssayResponse(responseId: string): Promise<EssayResponseView | null> {
  const supabase = await createClient()
  const { data: r } = await supabase
    .from('essay_responses')
    .select('id, prompt_id, body, word_count, timed, duration_minutes, time_spent_seconds, status, updated_at, essay_prompts(theme, task)')
    .eq('id', responseId)
    .maybeSingle()
  if (!r) return null
  const p = (r as { essay_prompts?: { theme: string; task: string } | null }).essay_prompts
  return {
    id: r.id,
    promptId: r.prompt_id,
    theme: p?.theme ?? 'Essay',
    task: p?.task ?? 'A',
    body: r.body,
    wordCount: r.word_count,
    timed: r.timed,
    durationMinutes: r.duration_minutes,
    timeSpentSeconds: r.time_spent_seconds,
    status: (r.status === 'submitted' ? 'submitted' : 'draft'),
    updatedAt: r.updated_at,
  }
}
