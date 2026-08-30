import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type { MockDef } from './config'

export type ResolvedSection = {
  subtestSlug: string
  name: string
  minutes: number
  questionIds: string[]
}

/** Draw a random published question set for each section of a mock, capped at the
 *  section's target. Sections with nothing published yet are dropped. */
export async function resolveMockSections(examId: string, mock: MockDef): Promise<ResolvedSection[]> {
  const supabase = createAdminClient()
  const { data: subs } = await supabase.from('subtests').select('id, slug').eq('exam_id', examId)
  const bySlug = new Map((subs ?? []).map((s) => [s.slug, s.id]))

  const out: ResolvedSection[] = []
  for (const sec of mock.sections) {
    const subtestId = bySlug.get(sec.subtestSlug)
    if (!subtestId) continue
    const { data: qs } = await supabase
      .from('questions')
      .select('id')
      .eq('published', true)
      .eq('subtest_id', subtestId)
    const ids = (qs ?? []).map((q) => q.id)
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[ids[i], ids[j]] = [ids[j], ids[i]]
    }
    const picked = ids.slice(0, Math.max(0, sec.count))
    if (picked.length) out.push({ subtestSlug: sec.subtestSlug, name: sec.name, minutes: sec.minutes, questionIds: picked })
  }
  return out
}
