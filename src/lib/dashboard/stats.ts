// Gamified dashboard, computed entirely on read from question_attempts + question
// tags — no extra tables, so it self-updates as the student practises. XP, levels,
// streaks, a weakness heatmap, mastery states, a spaced-review queue and a rough
// score band all fall out of the attempt log.
import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { canonicalCategories } from '@/lib/practice/categories'

const DAY = 86_400_000

// ---- XP + levels ----------------------------------------------------------
/** XP for one graded attempt. Correct answers earn more when fast (UCAT is
 *  time-pressured) and on an accuracy streak; a wrong answer still earns a little. */
function attemptXp(correct: boolean, seconds: number | null, streak: number): number {
  if (!correct) return 5
  const speed = seconds == null ? 1 : seconds <= 30 ? 1.6 : seconds <= 60 ? 1.2 : 1
  const streakMult = 1 + Math.min(streak, 10) * 0.05
  return Math.round(25 * speed * streakMult)
}
/** Total XP required to reach a level (level 1 = 0). Quadratic so levels slow down. */
const reachXp = (level: number) => 50 * level * (level - 1)
export function levelFromXp(xp: number): { level: number; into: number; toNext: number; span: number } {
  let level = 1
  while (reachXp(level + 1) <= xp) level++
  const cur = reachXp(level)
  const next = reachXp(level + 1)
  return { level, into: (xp - cur) / (next - cur), toNext: next - xp, span: next - cur }
}

export type SectionStat = {
  id: string
  name: string
  slug: string
  xp: number
  level: number
  into: number
  attempted: number
  correct: number
  accuracy: number | null
  avgSeconds: number | null
  streak: number // current run of correct answers, resets on a miss
}
export type HeatCell = { tag: string; section: string; count: number; accuracy: number | null; avgSeconds: number | null }
export type MasteryNode = { tag: string; state: 'locked' | 'learning' | 'mastered'; accuracy: number | null; count: number }
export type MasterySection = { name: string; nodes: MasteryNode[] }
export type ReviewItem = { questionId: string; section: string; tag: string | null; daysAgo: number }

export type Dashboard = {
  hasData: boolean
  totalXp: number
  level: number
  into: number
  toNext: number
  attempted: number
  correct: number
  accuracy: number | null
  dailyStreak: number
  practisedToday: boolean
  sections: SectionStat[]
  heatmap: HeatCell[]
  mastery: MasterySection[]
  predicted: { band: string; label: string }
  reviewDue: ReviewItem[]
  reviewUpcoming: number
}

type Attempt = { question_id: string; subtest_id: string; is_correct: boolean; time_spent_seconds: number | null; answered_at: string }

async function loadAttempts(userId: string, examId: string) {
  const supabase = createAdminClient()
  const { data: subs } = await supabase
    .from('subtests')
    .select('id, name, slug, sort_order')
    .eq('exam_id', examId)
    .order('sort_order')
  const { data: attempts } = await supabase
    .from('question_attempts')
    .select('question_id, subtest_id, is_correct, time_spent_seconds, answered_at')
    .eq('user_id', userId)
    .eq('exam_id', examId)
    .order('answered_at', { ascending: true })
  const rows = (attempts ?? []) as Attempt[]

  const qids = [...new Set(rows.map((a) => a.question_id))]
  const tagByQ = new Map<string, string[]>()
  if (qids.length) {
    const { data: qs } = await supabase.from('questions').select('id, tags').in('id', qids)
    for (const q of qs ?? []) tagByQ.set(q.id, q.tags ?? [])
  }
  return { subs: subs ?? [], rows, tagByQ }
}

function predictBand(accuracy: number | null): { band: string; label: string } {
  if (accuracy == null) return { band: '-', label: 'Practise to unlock' }
  const a = accuracy
  const b =
    a >= 90 ? '3100+' : a >= 80 ? '2900-3100' : a >= 70 ? '2700-2900' : a >= 60 ? '2500-2700' : a >= 45 ? '2300-2500' : '2100-2300'
  const label = a >= 80 ? 'Strong' : a >= 65 ? 'On track' : a >= 50 ? 'Building' : 'Early days'
  return { band: b, label }
}

export async function getDashboard(userId: string, examSlug: string, examId: string): Promise<Dashboard> {
  const { subs, rows, tagByQ } = await loadAttempts(userId, examId)

  // --- XP pass (ordered) with a running accuracy streak ---
  let totalXp = 0
  let streak = 0
  const secXp = new Map<string, number>()
  for (const a of rows) {
    streak = a.is_correct ? streak + 1 : 0
    const xp = attemptXp(a.is_correct, a.time_spent_seconds, streak)
    totalXp += xp
    secXp.set(a.subtest_id, (secXp.get(a.subtest_id) ?? 0) + xp)
  }

  // --- per-section aggregates + current correct-streak ---
  const bySec = new Map<string, Attempt[]>()
  for (const a of rows) {
    const arr = bySec.get(a.subtest_id) ?? []
    arr.push(a)
    bySec.set(a.subtest_id, arr)
  }
  const sections: SectionStat[] = subs.map((s) => {
    const list = bySec.get(s.id) ?? []
    const attempted = list.length
    const correct = list.filter((a) => a.is_correct).length
    const timed = list.filter((a) => a.time_spent_seconds != null)
    const avg = timed.length ? Math.round(timed.reduce((n, a) => n + (a.time_spent_seconds ?? 0), 0) / timed.length) : null
    let run = 0
    for (let k = list.length - 1; k >= 0; k--) { if (list[k].is_correct) run++; else break }
    const xp = secXp.get(s.id) ?? 0
    const lv = levelFromXp(xp)
    return { id: s.id, name: s.name, slug: s.slug, xp, level: lv.level, into: lv.into, attempted, correct, accuracy: attempted ? Math.round((correct / attempted) * 100) : null, avgSeconds: avg, streak: run }
  })

  // --- per-tag aggregation for heatmap + mastery ---
  type Agg = { count: number; correct: number; sec: number; timed: number }
  const tagAgg = new Map<string, Agg>() // key `${slug}|${tag}`
  const key = (slug: string, tag: string) => `${slug}|${tag}`
  const slugById = new Map(subs.map((s) => [s.id, s.slug]))
  const nameById = new Map(subs.map((s) => [s.id, s.name]))
  for (const a of rows) {
    const slug = slugById.get(a.subtest_id)
    if (!slug) continue
    for (const tag of tagByQ.get(a.question_id) ?? []) {
      const g = tagAgg.get(key(slug, tag)) ?? { count: 0, correct: 0, sec: 0, timed: 0 }
      g.count++
      if (a.is_correct) g.correct++
      if (a.time_spent_seconds != null) { g.sec += a.time_spent_seconds; g.timed++ }
      tagAgg.set(key(slug, tag), g)
    }
  }

  const heatmap: HeatCell[] = []
  const mastery: MasterySection[] = []
  for (const s of subs) {
    const cats = canonicalCategories(examSlug, s.slug) ?? []
    const nodes: MasteryNode[] = []
    for (const tag of cats) {
      const g = tagAgg.get(key(s.slug, tag))
      const acc = g && g.count ? Math.round((g.correct / g.count) * 100) : null
      const avg = g && g.timed ? Math.round(g.sec / g.timed) : null
      heatmap.push({ tag, section: s.name, count: g?.count ?? 0, accuracy: acc, avgSeconds: avg })
      const state: MasteryNode['state'] = !g || g.count < 3 ? 'locked' : acc != null && acc >= 80 ? 'mastered' : 'learning'
      nodes.push({ tag, state, accuracy: acc, count: g?.count ?? 0 })
    }
    if (nodes.length) mastery.push({ name: s.name, nodes })
  }

  // --- daily streak (distinct UTC days, allowing today-not-yet-practised) ---
  const days = new Set(rows.map((a) => a.answered_at.slice(0, 10)))
  const today = new Date().toISOString().slice(0, 10)
  const practisedToday = days.has(today)
  let dailyStreak = 0
  let cursor = new Date(today + 'T00:00:00Z').getTime()
  if (!practisedToday) cursor -= DAY // a streak stays alive until the day is missed
  while (days.has(new Date(cursor).toISOString().slice(0, 10))) { dailyStreak++; cursor -= DAY }

  // --- spaced review queue: questions whose latest attempt was wrong ---
  const latest = new Map<string, Attempt>()
  for (const a of rows) latest.set(a.question_id, a) // ordered asc → last wins
  const now = Date.now()
  const missed: ReviewItem[] = []
  let upcoming = 0
  for (const a of latest.values()) {
    if (a.is_correct) continue
    const daysAgo = Math.floor((now - new Date(a.answered_at).getTime()) / DAY)
    const item: ReviewItem = { questionId: a.question_id, section: nameById.get(a.subtest_id) ?? '', tag: (tagByQ.get(a.question_id) ?? [])[0] ?? null, daysAgo }
    if (daysAgo >= 1) missed.push(item)
    else upcoming++
  }
  missed.sort((x, y) => y.daysAgo - x.daysAgo)

  const attempted = rows.length
  const correct = rows.filter((a) => a.is_correct).length
  const accuracy = attempted ? Math.round((correct / attempted) * 100) : null
  const lv = levelFromXp(totalXp)

  return {
    hasData: attempted > 0,
    totalXp,
    level: lv.level,
    into: lv.into,
    toNext: lv.toNext,
    attempted,
    correct,
    accuracy,
    dailyStreak,
    practisedToday,
    sections,
    heatmap,
    mastery,
    predicted: predictBand(accuracy),
    reviewDue: missed,
    reviewUpcoming: upcoming,
  }
}

/** The exam this user most recently practised — the sensible default dashboard
 *  when no exam is pinned in the session cookie. */
export async function mostRecentExamId(userId: string): Promise<string | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('question_attempts')
    .select('exam_id')
    .eq('user_id', userId)
    .order('answered_at', { ascending: false })
    .limit(1)
  return data?.[0]?.exam_id ?? null
}

/** Ordered question ids for a spaced-review session (latest-wrong, oldest first). */
export async function resolveReviewQuestionIds(userId: string, examId: string): Promise<string[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('question_attempts')
    .select('question_id, is_correct, answered_at')
    .eq('user_id', userId)
    .eq('exam_id', examId)
    .order('answered_at', { ascending: true })
  const latest = new Map<string, boolean>()
  const at = new Map<string, string>()
  for (const a of data ?? []) { latest.set(a.question_id, a.is_correct); at.set(a.question_id, a.answered_at) }
  const now = Date.now()
  return [...latest.entries()]
    .filter(([, ok]) => !ok)
    .filter(([qid]) => now - new Date(at.get(qid)!).getTime() >= DAY)
    .sort(([a], [b]) => (at.get(a)! < at.get(b)! ? -1 : 1))
    .map(([qid]) => qid)
}
