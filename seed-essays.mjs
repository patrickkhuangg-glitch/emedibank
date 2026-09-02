// Seed GAMSAT Section II (Written Communication) essay prompts.
// Run:  cd /Users/patrick/Documents/EMediBank && node --env-file=.env.local seed-essays.mjs
// Idempotent: prompts are keyed by sort_order within the section, so re-running
// UPDATES the row in place (preserving its id and any linked essays) rather than
// duplicating — safe even when a theme's wording changes.
//
// Themes are deliberately vague — one or two words — like the real GAMSAT, where
// the theme is inferred from the quotes rather than spelled out.
import { createClient } from '@supabase/supabase-js'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const A =
  'Consider the following comments and develop a piece of writing in response to one or more of them. Your response will be assessed on the quality of your thinking about the theme and the control and effectiveness of your language. You may agree or disagree, and need not refer to all of them.'
const B =
  'Consider the following comments and develop a piece of writing in response to one or more of them. Your response may be personal and reflective. It will be assessed on the quality of your thinking about the theme and the control and effectiveness of your language.'

const PROMPTS = [
  { sort: 1, task: 'A', theme: 'Power', instructions: A, quotes: [
    { text: 'Power tends to corrupt, and absolute power corrupts absolutely.', author: 'Lord Acton' },
    { text: 'Nearly all men can stand adversity, but if you want to test a man’s character, give him power.', author: 'Abraham Lincoln' },
    { text: 'The greater the power, the more dangerous the abuse.', author: 'Edmund Burke' },
    { text: 'Where law ends, tyranny begins.', author: 'William Pitt' },
  ] },
  { sort: 2, task: 'A', theme: 'Progress', instructions: A, quotes: [
    { text: 'We shape our tools, and thereafter our tools shape us.', author: 'John Culkin' },
    { text: 'All that is human must retrograde if it does not advance.', author: 'Edward Gibbon' },
    { text: 'The real danger is not that computers will begin to think like people, but that people will begin to think like computers.', author: 'Sydney J. Harris' },
    { text: 'Technology is a useful servant but a dangerous master.', author: 'Christian Lous Lange' },
  ] },
  { sort: 3, task: 'B', theme: 'Belonging', instructions: B, quotes: [
    { text: 'No one can make you feel inferior without your consent.', author: 'Eleanor Roosevelt' },
    { text: 'The privilege of a lifetime is to become who you truly are.', author: 'Carl Jung' },
    { text: 'Home is not where you are born; home is where all your attempts to escape cease.', author: 'Naguib Mahfouz' },
    { text: 'We are all strangers in a strange land, longing for home but not quite knowing where it is.', author: 'Vera Nazarian' },
  ] },
  { sort: 4, task: 'A', theme: 'Freedom', instructions: A, quotes: [
    { text: 'Freedom is not worth having if it does not include the freedom to make mistakes.', author: 'Mahatma Gandhi' },
    { text: 'Those who deny freedom to others deserve it not for themselves.', author: 'Abraham Lincoln' },
    { text: 'Man is condemned to be free.', author: 'Jean-Paul Sartre' },
    { text: 'The only freedom which deserves the name is that of pursuing our own good in our own way.', author: 'John Stuart Mill' },
  ] },
  { sort: 5, task: 'B', theme: 'Memory', instructions: B, quotes: [
    { text: 'Memory is the diary we all carry about with us.', author: 'Oscar Wilde' },
    { text: 'We do not remember days, we remember moments.', author: 'Cesare Pavese' },
    { text: 'Nothing is ever really lost to us as long as we remember it.', author: 'L. M. Montgomery' },
    { text: 'The past is never dead. It is not even past.', author: 'William Faulkner' },
  ] },
  { sort: 6, task: 'B', theme: 'Change', instructions: B, quotes: [
    { text: 'There is nothing permanent except change.', author: 'Heraclitus' },
    { text: 'The only way to make sense out of change is to plunge into it and join the dance.', author: 'Alan Watts' },
    { text: 'We cannot become what we want by remaining what we are.', author: 'Max De Pree' },
    { text: 'Life is a process of becoming.', author: 'Anaïs Nin' },
  ] },
]

const { data: exam } = await admin.from('exams').select('id').eq('slug', 'gamsat').single()
const { data: sub } = await admin
  .from('subtests').select('id').eq('exam_id', exam.id).eq('slug', 'written-communication').single()

const { data: existing } = await admin.from('essay_prompts').select('id, sort_order').eq('subtest_id', sub.id)
const bySort = new Map((existing ?? []).map((r) => [r.sort_order, r.id]))

let inserted = 0, updated = 0
for (const p of PROMPTS) {
  const row = {
    subtest_id: sub.id, task: p.task, theme: p.theme, instructions: p.instructions,
    quotes: p.quotes, suggested_minutes: 30, is_free: false, published: true, sort_order: p.sort,
  }
  const id = bySort.get(p.sort)
  if (id) { await admin.from('essay_prompts').update(row).eq('id', id); updated++ }
  else { await admin.from('essay_prompts').insert(row); inserted++ }
}

console.log(`Section II prompts — inserted ${inserted}, updated ${updated}. Themes: ${PROMPTS.map((p) => p.theme).join(', ')}`)
