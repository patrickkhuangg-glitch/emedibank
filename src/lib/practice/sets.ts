import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { canAccessExam } from '@/lib/access'
import { questionMarkValue } from '@/lib/practice/marks'

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
type QuestionSet = { ids: string[]; marks: number }

async function fetchSets(subtestId: string, tag: string, subtestSlug = ''): Promise<QuestionSet[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('questions')
    .select('id, stimulus_id, sort_order, tags')
    .eq('published', true)
    .eq('subtest_id', subtestId)
  let rows = data ?? []
  if (tag) rows = rows.filter((r) => (r.tags ?? []).includes(tag))

  const groups = new Map<string, { id: string; sort: number; marks: number }[]>()
  const singles: QuestionSet[] = []
  for (const r of rows) {
    const marks = questionMarkValue(subtestSlug, r.tags)
    if (r.stimulus_id) {
      const arr = groups.get(r.stimulus_id) ?? []
      arr.push({ id: r.id, sort: r.sort_order ?? 0, marks })
      groups.set(r.stimulus_id, arr)
    } else {
      singles.push({ ids: [r.id], marks })
    }
  }
  const sets: QuestionSet[] = []
  for (const arr of groups.values()) {
    arr.sort((a, b) => a.sort - b.sort)
    sets.push({ ids: arr.map((x) => x.id), marks: arr.reduce((sum, item) => sum + item.marks, 0) })
  }
  return [...sets, ...singles]
}

/** How many sets exist in a section/category (for sizing the timing options). */
export async function countSets(subtestId: string, tag: string): Promise<number> {
  return (await fetchSets(subtestId, tag)).length
}

export async function countAvailableMarks(subtestId: string, subtestSlug: string, tag: string): Promise<number> {
  return (await fetchSets(subtestId, tag, subtestSlug)).reduce((sum, set) => sum + set.marks, 0)
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
  return picked.flatMap((set) => set.ids)
}

/** Select complete randomized question sets up to a target mark budget. This is
 * used by DM, where some screens are worth two marks and others one. */
export async function resolveMarkQuestionIds(
  userId: string,
  examId: string,
  subtestId: string,
  subtestSlug: string,
  tag: string,
  targetMarks: number,
): Promise<string[]> {
  if (!(await canAccessExam(userId, examId))) return []
  const sets = await fetchSets(subtestId, tag, subtestSlug)
  for (let i = sets.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[sets[i], sets[j]] = [sets[j], sets[i]]
  }
  const target = Math.max(1, targetMarks)
  const picked: QuestionSet[] = []
  let total = 0
  for (const set of sets) {
    if (total + set.marks <= target) { picked.push(set); total += set.marks }
  }
  if (total < target) {
    const remaining = sets.filter((set) => !picked.includes(set)).sort((a, b) => a.marks - b.marks)
    const candidate = remaining[0]
    if (candidate && Math.abs(target - (total + candidate.marks)) < Math.abs(target - total)) picked.push(candidate)
  }
  return picked.flatMap((set) => set.ids)
}
