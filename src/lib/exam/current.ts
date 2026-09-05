import 'server-only'
import { cookies } from 'next/headers'
import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ExamKind } from '@/lib/supabase/types'

// The exam a student picked "for this session" (Open Studocyte -> exam picker).
// A cookie, not a DB field: it only scopes the UI (which exam Practice/Mock
// target), never access — access still runs through the entitlement layer.
export const EXAM_COOKIE = 'eb_exam'

export type ExamLite = { id: string; slug: string; name: string; kind: ExamKind }

export async function getCurrentExamSlug(): Promise<string | null> {
  const c = await cookies()
  return c.get(EXAM_COOKIE)?.value ?? null
}

/** Active exams, ordered for display. Interviews is a first-class exam here;
 *  its selected route and navigation remain tailored to interview preparation. */
export const listExams = unstable_cache(
  async (): Promise<ExamLite[]> => {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('exams')
      .select('id, slug, name, kind')
      .eq('active', true)
      .order('created_at')
    return data ?? []
  },
  ['exams-list'],
  { revalidate: 300, tags: ['exams'] },
)

/** The current exam resolved to a full row, if the cookie points at a real exam. */
export async function getCurrentExam(): Promise<ExamLite | null> {
  const slug = await getCurrentExamSlug()
  if (!slug) return null
  return (await listExams()).find((e) => e.slug === slug) ?? null
}
