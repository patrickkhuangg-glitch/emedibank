// Import the GAMSAT Section II quote bank (themes + 4 quotes each) as essay prompts.
// Run: cd /Users/patrick/Documents/EMediBank && node --env-file=.env.local seed-quote-bank.mjs
// Idempotent: upserts by theme name, so re-running updates in place (preserving
// prompt ids and any linked student essays) rather than duplicating.
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const SRC = '/Users/patrick/Downloads/GAMSAT_Quote_Bank_100_Themes.md'

const A =
  'Consider the following comments and develop a piece of writing in response to one or more of them. Your response will be assessed on the quality of your thinking about the theme and the control and effectiveness of your language. You may agree or disagree, and need not refer to all of them.'
const B =
  'Consider the following comments and develop a piece of writing in response to one or more of them. Your response may be personal and reflective. It will be assessed on the quality of your thinking about the theme and the control and effectiveness of your language.'

// ── Parse the markdown ───────────────────────────────────────────────────────
function stripQuotes(s) {
  return s.trim().replace(/^[“”"']+/, '').replace(/[“”"']+$/, '').trim()
}
function parseQuote(line) {
  const s = line.replace(/^\s*\d+\.\s*/, '').trim()
  let idx = -1, sepLen = 3
  for (const sep of [' — ', ' – ', ' — ', ' - ']) { const i = s.lastIndexOf(sep); if (i > idx) { idx = i; sepLen = sep.length } }
  const text = idx >= 0 ? s.slice(0, idx) : s
  const author = idx >= 0 ? s.slice(idx + sepLen).trim() : ''
  return { text: stripQuotes(text), author: author || null }
}

const lines = readFileSync(SRC, 'utf8').split('\n')
const headerRe = /^###\s+(\d+)\.\s*(.+?)\s*[—–-]\s*\[Task\s*([AB])\]/i
const quoteRe = /^\s*\d+\.\s+/
const themes = []
let cur = null
for (const line of lines) {
  const h = line.match(headerRe)
  if (h) { cur = { num: +h[1], theme: h[2].trim(), task: h[3].toUpperCase(), quotes: [] }; themes.push(cur); continue }
  if (cur && quoteRe.test(line)) cur.quotes.push(parseQuote(line))
}

// Sanity check: keep only well-formed themes with exactly 4 quotes.
const good = themes.filter((t) => t.theme && t.quotes.length === 4 && t.quotes.every((q) => q.text))
const bad = themes.filter((t) => !good.includes(t))
console.log(`Parsed ${themes.length} themes; ${good.length} well-formed, ${bad.length} skipped.`)
if (bad.length) for (const b of bad) console.log('  SKIP:', b.num, b.theme, '(quotes:', b.quotes.length + ')')
console.log('Task split:', good.filter((t) => t.task === 'A').length, 'Task A /', good.filter((t) => t.task === 'B').length, 'Task B')
console.log('Spot check:')
for (const n of [40, 82, 90]) { const t = good.find((x) => x.num === n); if (t) console.log(`  #${n} ${t.theme} [${t.task}] — q1: "${t.quotes[0].text.slice(0, 40)}…" — ${t.quotes[0].author}`) }

// ── Upsert into essay_prompts ────────────────────────────────────────────────
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const { data: exam } = await admin.from('exams').select('id').eq('slug', 'gamsat').single()
const { data: sub } = await admin.from('subtests').select('id').eq('exam_id', exam.id).eq('slug', 'written-communication').single()
const { data: existing } = await admin.from('essay_prompts').select('id, theme').eq('subtest_id', sub.id)
const byTheme = new Map((existing ?? []).map((r) => [r.theme.toLowerCase(), r.id]))

let inserted = 0, updated = 0
for (const t of good) {
  const row = {
    subtest_id: sub.id, task: t.task, theme: t.theme, instructions: t.task === 'A' ? A : B,
    quotes: t.quotes, suggested_minutes: 30, is_free: false, published: true, sort_order: t.num,
  }
  const id = byTheme.get(t.theme.toLowerCase())
  if (id) { await admin.from('essay_prompts').update(row).eq('id', id); updated++ }
  else { await admin.from('essay_prompts').insert(row); inserted++ }
}
console.log(`\nDone — inserted ${inserted}, updated ${updated}.`)
const { count } = await admin.from('essay_prompts').select('id', { count: 'exact', head: true }).eq('subtest_id', sub.id).eq('published', true)
console.log(`Published Section II prompts now: ${count}`)
