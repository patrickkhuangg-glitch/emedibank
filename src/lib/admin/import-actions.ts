'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/auth/dal'
import { createClient } from '@/lib/supabase/server'

export type ImportResult = { created: number; stimuli: number; errors: { row: number; message: string }[] }

async function requireAdmin() {
  const p = await getProfile()
  if (p?.role !== 'admin') redirect('/dashboard')
}

/** Parse CSV or TSV (RFC4180-ish quoting) into rows of cells. */
function parseDelimited(text: string): string[][] {
  const firstLine = text.split(/\r?\n/)[0] ?? ''
  const delim = firstLine.includes('\t') && !firstLine.includes(',') ? '\t' : ','
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++ } else q = false }
      else field += c
    } else if (c === '"') q = true
    else if (c === delim) { row.push(field); field = '' }
    else if (c === '\r') { /* ignore */ }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else field += c
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

function parseTableCell(v: string): { headers: string[]; rows: string[][] } | null {
  const lines = v.split(';').map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return null
  return { headers: lines[0].split('|').map((c) => c.trim()), rows: lines.slice(1).map((l) => l.split('|').map((c) => c.trim())) }
}
function parseStatements(v: string): { text: string; correct: 'Yes' | 'No' }[] {
  return v.split(';').map((s) => s.trim()).filter(Boolean).map((s) => {
    const [text, ans] = s.split('::').map((x) => x.trim())
    return { text, correct: (/^y/i.test(ans ?? '') ? 'Yes' : 'No') as 'Yes' | 'No' }
  }).filter((s) => s.text)
}

export async function importQuestions(text: string): Promise<ImportResult> {
  await requireAdmin()
  const supabase = await createClient()
  const grid = parseDelimited(text)
  if (grid.length < 2) return { created: 0, stimuli: 0, errors: [{ row: 0, message: 'No data rows found.' }] }

  const headers = grid[0].map((h) => h.trim().toLowerCase())
  const col = (name: string) => headers.indexOf(name)
  const cell = (r: string[], name: string) => { const i = col(name); return i >= 0 ? (r[i] ?? '').trim() : '' }

  const [{ data: exams }, { data: subs }] = await Promise.all([
    supabase.from('exams').select('id, name'),
    supabase.from('subtests').select('id, name, exam_id'),
  ])
  const examName = new Map((exams ?? []).map((e) => [e.id, e.name.toLowerCase()]))
  const subLookup = new Map<string, string>()
  for (const su of subs ?? []) subLookup.set(`${examName.get(su.exam_id) ?? ''}|${su.name.toLowerCase()}`, su.id)

  const errors: ImportResult['errors'] = []
  const stimulusCache = new Map<string, string>()
  let created = 0
  let stimuli = 0

  for (let r = 1; r < grid.length; r++) {
    const row = grid[r]
    try {
      const subtestId = subLookup.get(`${cell(row, 'exam').toLowerCase()}|${cell(row, 'subtest').toLowerCase()}`)
      if (!subtestId) { errors.push({ row: r + 1, message: `Unknown exam/subtest: "${cell(row, 'exam')} / ${cell(row, 'subtest')}"` }); continue }
      const type = (cell(row, 'type') || 'mcq').toLowerCase()

      let stimulusId: string | null = null
      const stimKey = cell(row, 'stimulus_key')
      if (stimKey) {
        stimulusId = stimulusCache.get(stimKey) ?? null
        if (!stimulusId) {
          const sdata: Record<string, unknown> = {}
          if (cell(row, 'passage')) sdata.passage = cell(row, 'passage')
          if (cell(row, 'image_url')) sdata.image = cell(row, 'image_url')
          const t = parseTableCell(cell(row, 'table')); if (t) sdata.table = t
          const { data: stim, error } = await supabase.from('stimuli').insert({ subtest_id: subtestId, title: stimKey, data: Object.keys(sdata).length ? sdata : null }).select('id').single()
          if (error) throw error
          stimulusId = stim.id; stimulusCache.set(stimKey, stimulusId); stimuli++
        }
      }

      const qdata: Record<string, unknown> = {}
      if (!stimulusId) {
        if (type === 'passage' && cell(row, 'passage')) qdata.passage = cell(row, 'passage')
        if (cell(row, 'image_url')) qdata.image = cell(row, 'image_url')
        const t = parseTableCell(cell(row, 'table')); if (t) qdata.table = t
      }
      if (type === 'grid') qdata.statements = parseStatements(cell(row, 'statements'))
      if (type === 'most_least') {
        const actions = cell(row, 'actions').split(';').map((a) => a.trim()).filter(Boolean).map((t) => ({ text: t }))
        qdata.mostLeast = { actions, correctMost: Math.max(0, Number(cell(row, 'most') || 1) - 1), correctLeast: Math.max(0, Number(cell(row, 'least') || 2) - 1) }
      }
      const diff = cell(row, 'difficulty').toLowerCase()
      const { data: q, error } = await supabase.from('questions').insert({
        subtest_id: subtestId,
        stimulus_id: stimulusId,
        kind: 'single_best_answer',
        stem: cell(row, 'stem'),
        topic: cell(row, 'topic') || null,
        explanation_text: cell(row, 'explanation') || null,
        difficulty: (['easy', 'medium', 'hard'].includes(diff) ? diff : null) as 'easy' | 'medium' | 'hard' | null,
        // Split on ';' (not ',') so category names that contain commas — e.g.
        // "True, False, Can't Tell" — survive as a single tag.
        tags: cell(row, 'tags').split(';').map((t) => t.trim()).filter(Boolean),
        published: /^(y|yes|true|1)$/i.test(cell(row, 'published')),
        data: Object.keys(qdata).length ? qdata : null,
      }).select('id').single()
      if (error) throw error

      if (type === 'mcq' || type === 'passage') {
        const correct = cell(row, 'correct').toUpperCase()
        const opts = ['a', 'b', 'c', 'd', 'e']
          .map((L) => ({ label: L.toUpperCase(), body: cell(row, `option_${L}`) }))
          .filter((o) => o.body)
          .map((o, i) => ({ question_id: q.id, label: o.label, body: o.body, is_correct: o.label === correct, sort_order: i + 1 }))
        if (opts.length) { const { error: oe } = await supabase.from('question_options').insert(opts); if (oe) throw oe }
      }
      created++
    } catch (e) {
      errors.push({ row: r + 1, message: e instanceof Error ? e.message : 'row failed' })
    }
  }

  revalidatePath('/admin/questions')
  return { created, stimuli, errors }
}
