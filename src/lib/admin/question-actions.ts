'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/auth/dal'
import { createClient } from '@/lib/supabase/server'
import { createVideoUpload } from '@/lib/mux/upload'
import { getOrigin } from '@/lib/site'

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

export async function togglePublishAction(formData: FormData) {
  await requireAdmin()
  const supabase = await createClient()
  await supabase.from('questions').update({ published: formData.get('next') === 'true' }).eq('id', String(formData.get('id')))
  revalidatePath('/admin/questions')
}

export async function deleteQuestionAction(formData: FormData) {
  await requireAdmin()
  const supabase = await createClient()
  await supabase.from('questions').delete().eq('id', String(formData.get('id')))
  revalidatePath('/admin/questions')
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
