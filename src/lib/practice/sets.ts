import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { canAccessExam } from '@/lib/access'

// A "question set" is the unit the timing step counts. Confirmed per section by
// the user, the rule is uniform because it follows how questions are authored:
//
//   a set = one stimulus group (a passage/scenario and every question on it),
//           or a single standalone question (no stimulus).
//
// So "3 question sets" of Verbal Reasoning = 3 passages with all their questions;
// of Decision Making = 3 standalone questions. Questions in a set stay together
// and in order, so a passage's questions run consecutively in the session.

/** All sets for a section (optionally one category tag), each an ordered id list. */
async function fetchSets(subtestId: string, tag: string): Promise<string[][]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('questions')
    .select('id, stimulus_id, sort_order, tags')
    .eq('published', true)
    .eq('subtest_id', subtestId)
  let rows = data ?? []
  if (tag) rows = rows.filter((r) => (r.tags ?? []).includes(tag))

  const groups = new Map<string, { id: string; sort: number }[]>()
  const singles: string[][] = []
  for (const r of rows) {
    if (r.stimulus_id) {
      const arr = groups.get(r.stimulus_id) ?? []
      arr.push({ id: r.id, sort: r.sort_order ?? 0 })
      groups.set(r.stimulus_id, arr)
    } else {
      singles.push([r.id])
    }
  }
  const sets: string[][] = []
  for (const arr of groups.values()) {
    arr.sort((a, b) => a.sort - b.sort)
    sets.push(arr.map((x) => x.id))
  }
  return [...sets, ...singles]
}

/** How many sets exist in a section/category (for sizing the timing options). */
export async function countSets(subtestId: string, tag: string): Promise<number> {
  return (await fetchSets(subtestId, tag)).length
}

/** Flatten a randomized selection of sets into ordered question ids (entitled only).
 *  maxSets <= 0 means every set (used for timed practice, which is time-boxed). */
export async function resolveSetQuestionIds(
  userId: string,
  examId: string,
  subtestId: string,
  tag: string,
  maxSets: number,
): Promise<string[]> {
  if (!(await canAccessExam(userId, examId))) return []
  const sets = await fetchSets(subtestId, tag)
  for (let i = sets.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[sets[i], sets[j]] = [sets[j], sets[i]]
  }
  const picked = maxSets > 0 ? sets.slice(0, maxSets) : sets
  return picked.flat()
}
