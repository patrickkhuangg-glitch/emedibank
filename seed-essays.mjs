// Seed GAMSAT Section II (Written Communication) essay prompts.
// Run AFTER migration 0012_essays.sql is applied:
//   cd /Users/patrick/Documents/EMediBank && node --env-file=.env.local seed-essays.mjs
// Idempotent: prompts are keyed by theme within the section, so re-running updates
// rather than duplicating.
import { createClient } from '@supabase/supabase-js'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const TASK_A_INSTRUCTIONS =
  'Consider the following comments and develop a piece of writing in response to one or more of them. Your response will be assessed on the quality of your thinking about the theme and the control and effectiveness of your language. You may agree or disagree with the comments, and you are not required to refer to all of them.'
const TASK_B_INSTRUCTIONS =
  'Consider the following comments and develop a piece of writing in response to one or more of them. Your response may be personal and reflective. It will be assessed on the quality of your thinking about the theme and the control and effectiveness of your language.'

const PROMPTS = [
  {
    task: 'A',
    theme: 'Power and those who hold it',
    instructions: TASK_A_INSTRUCTIONS,
    suggested_minutes: 30,
    sort_order: 1,
    quotes: [
      { text: 'Power tends to corrupt, and absolute power corrupts absolutely.', author: 'Lord Acton' },
      { text: 'Nearly all men can stand adversity, but if you want to test a man’s character, give him power.', author: 'Abraham Lincoln' },
      { text: 'The greater the power, the more dangerous the abuse.', author: 'Edmund Burke' },
      { text: 'Where law ends, tyranny begins.', author: 'William Pitt' },
    ],
  },
  {
    task: 'A',
    theme: 'Progress and its price',
    instructions: TASK_A_INSTRUCTIONS,
    suggested_minutes: 30,
    sort_order: 2,
    quotes: [
      { text: 'We shape our tools, and thereafter our tools shape us.', author: 'John Culkin' },
      { text: 'All that is human must retrograde if it does not advance.', author: 'Edward Gibbon' },
      { text: 'The real danger is not that computers will begin to think like people, but that people will begin to think like computers.', author: 'Sydney J. Harris' },
      { text: 'Technology is a useful servant but a dangerous master.', author: 'Christian Lous Lange' },
    ],
  },
  {
    task: 'B',
    theme: 'On belonging',
    instructions: TASK_B_INSTRUCTIONS,
    suggested_minutes: 30,
    sort_order: 3,
    quotes: [
      { text: 'No one can make you feel inferior without your consent.', author: 'Eleanor Roosevelt' },
      { text: 'The privilege of a lifetime is to become who you truly are.', author: 'Carl Jung' },
      { text: 'Home is not where you are born; home is where all your attempts to escape cease.', author: 'Naguib Mahfouz' },
      { text: 'We are all strangers in a strange land, longing for home but not quite knowing where it is.', author: 'Vera Nazarian' },
    ],
  },
]

const { data: exam } = await admin.from('exams').select('id').eq('slug', 'gamsat').single()
const { data: sub } = await admin
  .from('subtests').select('id').eq('exam_id', exam.id).eq('slug', 'written-communication').single()

const { data: existing } = await admin
  .from('essay_prompts').select('id, theme').eq('subtest_id', sub.id)
const byTheme = new Map((existing ?? []).map((r) => [r.theme, r.id]))

let inserted = 0, updated = 0
for (const p of PROMPTS) {
  const row = {
    subtest_id: sub.id, task: p.task, theme: p.theme, instructions: p.instructions,
    quotes: p.quotes, suggested_minutes: p.suggested_minutes, is_free: false,
    published: true, sort_order: p.sort_order,
  }
  const id = byTheme.get(p.theme)
  if (id) { await admin.from('essay_prompts').update(row).eq('id', id); updated++ }
  else { await admin.from('essay_prompts').insert(row); inserted++ }
}

console.log(`Section II essay prompts — inserted ${inserted}, updated ${updated}, published ${PROMPTS.length} total.`)
