import 'server-only'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'

// The exam a student picked "for this session" (Open EMediBank -> exam picker).
// A cookie, not a DB field: it only scopes the UI (which exam Practice/Mock
// target), never access — access still runs through the entitlement layer.
export const EXAM_COOKIE = 'eb_exam'

export type ExamLite = { id: string; slug: string; name: string }

export async function getCurrentExamSlug(): Promise<string | null> {
  const c = await cookies()
  return c.get(EXAM_COOKIE)?.value ?? null
}

/** Active MCQ exams (UCAT/GAMSAT/ISAT), ordered for display. */
export async function listExams(): Promise<ExamLite[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('exams')
    .select('id, slug, name')
    .eq('active', true)
    .eq('kind', 'mcq')
    .order('created_at')
  return data ?? []
}

/** The current exam resolved to a full row, if the cookie points at a real exam. */
export async function getCurrentExam(): Promise<ExamLite | null> {
  const slug = await getCurrentExamSlug()
  if (!slug) return null
  return (await listExams()).find((e) => e.slug === slug) ?? null
}
