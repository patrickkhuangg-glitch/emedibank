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

export async function createQuestionAction(formData: FormData) {
  await requireAdmin()
  const supabase = await createClient() // admin RLS permits the write

  const correct = String(formData.get('correct') ?? 'A')
  const { data: q, error } = await supabase
    .from('questions')
    .insert({
      subtest_id: String(formData.get('subtest_id')),
      kind: 'single_best_answer',
      stem: String(formData.get('stem') ?? '').trim(),
      topic: String(formData.get('topic') ?? '').trim() || null,
      explanation_text: String(formData.get('explanation_text') ?? '').trim() || null,
      difficulty: (String(formData.get('difficulty') ?? '') || null) as 'easy' | 'medium' | 'hard' | null,
      published: formData.get('published') === 'on',
    })
    .select('id')
    .single()
  if (error) throw error

  const rows = ['A', 'B', 'C', 'D']
    .map((L, i) => ({
      question_id: q.id,
      label: L,
      body: String(formData.get(`opt_${L}`) ?? '').trim(),
      is_correct: L === correct,
      sort_order: i + 1,
    }))
    .filter((r) => r.body)
  const { error: oErr } = await supabase.from('question_options').insert(rows)
  if (oErr) throw oErr

  revalidatePath('/admin/questions')
  redirect('/admin/questions')
}

export async function togglePublishAction(formData: FormData) {
  await requireAdmin()
  const supabase = await createClient()
  await supabase
    .from('questions')
    .update({ published: formData.get('next') === 'true' })
    .eq('id', String(formData.get('id')))
  revalidatePath('/admin/questions')
}

export async function deleteQuestionAction(formData: FormData) {
  await requireAdmin()
  const supabase = await createClient()
  await supabase.from('questions').delete().eq('id', String(formData.get('id')))
  revalidatePath('/admin/questions')
}

export async function createVideoUploadAction(
  questionId: string,
): Promise<{ uploadUrl: string } | { error: string }> {
  await requireAdmin()
  try {
    const { uploadUrl } = await createVideoUpload(questionId, await getOrigin())
    return { uploadUrl }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Upload could not start' }
  }
}
