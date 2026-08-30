'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/auth/dal'
import { createClient } from '@/lib/supabase/server'
import { createVideoUpload } from '@/lib/mux/upload'
import { getOrigin } from '@/lib/site'
import type { QFilter } from './question-filter'

async function requireAdmin() {
  const p = await getProfile()
  if (p?.role !== 'admin') redirect('/dashboard')
}

export type QuestionInput = {
  subtestId: string
  type: 'mcq' | 'passage' | 'grid' | 'most_least'
  topic: string
  difficulty: string
  tags: string[]
  stem: string
  passage: string
  imageUrl: string
  explanation: string
  published: boolean
  options: { label: string; body: string; correct: boolean }[]
  table: { headers: string[]; rows: string[][] } | null
  statements: { text: string; correct: 'Yes' | 'No' }[]
  actions: { text: string }[]
  correctMost: number
  correctLeast: number
}

export async function createQuestion(input: QuestionInput) {
  await requireAdmin()
  const supabase = await createClient()

  const data: Record<string, unknown> = {}
  if (input.imageUrl.trim()) data.image = input.imageUrl.trim()
  if (input.type === 'passage' && input.passage.trim()) data.passage = input.passage.trim()
  if (input.table && input.table.headers.length) data.table = input.table
  if (input.type === 'grid') {
    data.statements = input.statements.filter((s) => s.text.trim()).map((s) => ({ text: s.text.trim(), correct: s.correct }))
  }
  if (input.type === 'most_least') {
    const actions = input.actions.filter((a) => a.text.trim()).map((a) => ({ text: a.text.trim() }))
    data.mostLeast = { actions, correctMost: input.correctMost, correctLeast: input.correctLeast }
  }

  const { data: q, error } = await supabase
    .from('questions')
    .insert({
      subtest_id: input.subtestId,
      kind: 'single_best_answer',
      stem: input.stem.trim(),
      topic: input.topic.trim() || null,
      explanation_text: input.explanation.trim() || null,
      difficulty: (input.difficulty || null) as 'easy' | 'medium' | 'hard' | null,
      tags: input.tags,
      published: input.published,
      data: Object.keys(data).length ? data : null,
    })
    .select('id')
    .single()
  if (error) throw error

  if (input.type === 'mcq' || input.type === 'passage') {
    const rows = input.options
      .filter((o) => o.body.trim())
      .map((o, i) => ({ question_id: q.id, label: o.label, body: o.body.trim(), is_correct: o.correct, sort_order: i + 1 }))
    if (rows.length) {
      const { error: oErr } = await supabase.from('question_options').insert(rows)
      if (oErr) throw oErr
    }
  }

  revalidatePath('/admin/questions')
}

// ---- Bulk operations (used by the admin list; also cover single-item actions) ----

/** Resolve every question id matching a filter (used for "select all matching"). */
async function matchingIds(f: QFilter): Promise<string[]> {
  const supabase = await createClient()
  let sel = supabase.from('questions').select('id')
  if (f.subtestId) sel = sel.eq('subtest_id', f.subtestId)
  else if (f.examId) {
    const { data: subs } = await supabase.from('subtests').select('id').eq('exam_id', f.examId)
    sel = sel.in('subtest_id', (subs ?? []).map((s) => s.id))
  }
  if (f.status === 'published') sel = sel.eq('published', true)
  else if (f.status === 'draft') sel = sel.eq('published', false)
  if (f.search.trim()) sel = sel.ilike('stem', `%${f.search.trim()}%`)
  const { data } = await sel
  return (data ?? []).map((r) => r.id)
}

export async function bulkDeleteIds(ids: string[]) {
  await requireAdmin()
  if (!ids.length) return
  const supabase = await createClient()
  const { error } = await supabase.from('questions').delete().in('id', ids)
  if (error) throw error
  revalidatePath('/admin/questions')
}

export async function bulkSetPublishedIds(ids: string[], published: boolean) {
  await requireAdmin()
  if (!ids.length) return
  const supabase = await createClient()
  const { error } = await supabase.from('questions').update({ published }).in('id', ids)
  if (error) throw error
  revalidatePath('/admin/questions')
}

export async function bulkDeleteMatching(f: QFilter): Promise<number> {
  await requireAdmin()
  const ids = await matchingIds(f)
  if (ids.length) {
    const supabase = await createClient()
    const { error } = await supabase.from('questions').delete().in('id', ids)
    if (error) throw error
    revalidatePath('/admin/questions')
  }
  return ids.length
}

export async function bulkSetPublishedMatching(f: QFilter, published: boolean): Promise<number> {
  await requireAdmin()
  const ids = await matchingIds(f)
  if (ids.length) {
    const supabase = await createClient()
    const { error } = await supabase.from('questions').update({ published }).in('id', ids)
    if (error) throw error
    revalidatePath('/admin/questions')
  }
  return ids.length
}

export async function createVideoUploadAction(questionId: string): Promise<{ uploadUrl: string } | { error: string }> {
  await requireAdmin()
  try {
    const { uploadUrl } = await createVideoUpload(questionId, await getOrigin())
    return { uploadUrl }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Upload could not start' }
  }
}
