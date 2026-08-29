'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createQuestion, type QuestionInput } from '@/lib/admin/question-actions'

type QType = 'mcq' | 'passage' | 'grid' | 'most_least'
const TYPES: { value: QType; label: string; hint: string }[] = [
  { value: 'mcq', label: 'MCQ', hint: 'Single best answer (QR, DM, SJT rating)' },
  { value: 'passage', label: 'Passage MCQ', hint: 'Two-column: passage/scenario + options (VR, SJT)' },
  { value: 'grid', label: 'Yes/No grid', hint: 'DM syllogisms / interpreting information' },
  { value: 'most_least', label: 'Most/Least', hint: 'SJT drag-and-drop appropriateness' },
]
const input = 'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand'

export function NewQuestionForm({ subtests }: { subtests: { id: string; name: string; exam: string }[] }) {
  const router = useRouter()
  const [type, setType] = useState<QType>('mcq')
  const [subtestId, setSubtestId] = useState(subtests[0]?.id ?? '')
  const [topic, setTopic] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [tags, setTags] = useState('')
  const [stem, setStem] = useState('')
  const [passage, setPassage] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [explanation, setExplanation] = useState('')
  const [published, setPublished] = useState(false)
  const [tableText, setTableText] = useState('')
  const [options, setOptions] = useState([
    { label: 'A', body: '', correct: true },
    { label: 'B', body: '', correct: false },
    { label: 'C', body: '', correct: false },
    { label: 'D', body: '', correct: false },
  ])
  const [statements, setStatements] = useState<{ text: string; correct: 'Yes' | 'No' }[]>(
    Array.from({ length: 5 }, () => ({ text: '', correct: 'Yes' as const })),
  )
  const [actions, setActions] = useState<{ text: string }[]>([{ text: '' }, { text: '' }, { text: '' }])
  const [correctMost, setCorrectMost] = useState(0)
  const [correctLeast, setCorrectLeast] = useState(1)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  function parseTable(): QuestionInput['table'] {
    const lines = tableText.split('\n').map((l) => l.trim()).filter(Boolean)
    if (lines.length < 2) return null
    const headers = lines[0].split('|').map((c) => c.trim())
    const rows = lines.slice(1).map((l) => l.split('|').map((c) => c.trim()))
    return { headers, rows }
  }

  async function submit() {
    setBusy(true)
    setMsg('')
    try {
      await createQuestion({
        subtestId, type,
        topic, difficulty, stem, passage, imageUrl, explanation, published,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        options, table: parseTable(), statements, actions, correctMost, correctLeast,
      })
      setMsg('Question created.')
      setStem(''); setPassage(''); setExplanation(''); setImageUrl(''); setTableText('')
      setOptions([{ label: 'A', body: '', correct: true }, { label: 'B', body: '', correct: false }, { label: 'C', body: '', correct: false }, { label: 'D', body: '', correct: false }])
      setStatements(Array.from({ length: 5 }, () => ({ text: '', correct: 'Yes' as const })))
      setActions([{ text: '' }, { text: '' }, { text: '' }])
      router.refresh()
    } catch (e) {
      setMsg('Error: ' + (e instanceof Error ? e.message : 'could not save'))
    }
    setBusy(false)
  }

  const label = 'mb-1 block font-medium'
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-surface p-6">
      <h2 className="font-semibold">New question</h2>

      <div className="grid gap-2 sm:grid-cols-4">
        {TYPES.map((t) => (
          <button key={t.value} onClick={() => setType(t.value)} title={t.hint}
            className={`rounded-lg border px-3 py-2 text-sm ${type === t.value ? 'border-brand bg-brand text-brand-foreground' : 'border-border bg-surface hover:bg-surface-muted'}`}>
            {t.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted">{TYPES.find((t) => t.value === type)?.hint}</p>

      <label className="block text-sm">
        <span className={label}>Subtest</span>
        <select value={subtestId} onChange={(e) => setSubtestId(e.target.value)} className={input}>
          {subtests.map((s) => <option key={s.id} value={s.id}>{s.exam} · {s.name}</option>)}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm"><span className={label}>Topic</span><input value={topic} onChange={(e) => setTopic(e.target.value)} className={input} /></label>
        <label className="block text-sm"><span className={label}>Difficulty</span>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className={input}><option value="">—</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select>
        </label>
      </div>
      <label className="block text-sm"><span className={label}>Tags (comma-separated — e.g. Syllogisms)</span><input value={tags} onChange={(e) => setTags(e.target.value)} className={input} placeholder="e.g. ratios, unit-conversion" /></label>

      {type === 'passage' ? (
        <label className="block text-sm"><span className={label}>Passage / scenario (left column)</span><textarea value={passage} onChange={(e) => setPassage(e.target.value)} rows={5} className={input} /></label>
      ) : null}

      <label className="block text-sm">
        <span className={label}>{type === 'most_least' ? 'Scenario + instruction' : 'Question stem'}</span>
        <textarea value={stem} onChange={(e) => setStem(e.target.value)} rows={3} className={input} required />
      </label>

      <label className="block text-sm"><span className={label}>Diagram image URL (optional)</span><input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className={input} placeholder="https://…" /></label>

      {type === 'grid' ? (
        <label className="block text-sm"><span className={label}>Table (optional — rows on new lines, cells split by | ; first line = headers)</span>
          <textarea value={tableText} onChange={(e) => setTableText(e.target.value)} rows={4} className={`${input} font-mono text-xs`} placeholder={'Machine A | Machine B\n600 | 0\n400 | 800'} />
        </label>
      ) : null}

      {type === 'mcq' || type === 'passage' ? (
        <div className="space-y-2">
          <span className="text-sm font-medium">Options (select the correct one)</span>
          {options.map((o, idx) => (
            <div key={o.label} className="flex items-center gap-2">
              <input type="radio" name="correct" checked={o.correct} onChange={() => setOptions(options.map((x, i) => ({ ...x, correct: i === idx })))} />
              <span className="w-4 text-sm font-semibold">{o.label}</span>
              <input value={o.body} onChange={(e) => setOptions(options.map((x, i) => i === idx ? { ...x, body: e.target.value } : x))} className={input} placeholder={`Option ${o.label}`} />
            </div>
          ))}
        </div>
      ) : null}

      {type === 'grid' ? (
        <div className="space-y-2">
          <span className="text-sm font-medium">Statements (set the correct Yes/No for each)</span>
          {statements.map((s, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input value={s.text} onChange={(e) => setStatements(statements.map((x, i) => i === idx ? { ...x, text: e.target.value } : x))} className={input} placeholder={`Statement ${idx + 1}`} />
              <select value={s.correct} onChange={(e) => setStatements(statements.map((x, i) => i === idx ? { ...x, correct: e.target.value as 'Yes' | 'No' } : x))} className="rounded-lg border border-border bg-surface px-2 py-2 text-sm"><option>Yes</option><option>No</option></select>
              <button onClick={() => setStatements(statements.filter((_, i) => i !== idx))} className="text-xs text-[#dc2626]">✕</button>
            </div>
          ))}
          <button onClick={() => setStatements([...statements, { text: '', correct: 'Yes' }])} className="text-xs text-brand">+ Add statement</button>
        </div>
      ) : null}

      {type === 'most_least' ? (
        <div className="space-y-2">
          <span className="text-sm font-medium">Actions</span>
          {actions.map((a, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="w-4 text-xs text-muted">{idx + 1}</span>
              <input value={a.text} onChange={(e) => setActions(actions.map((x, i) => i === idx ? { text: e.target.value } : x))} className={input} placeholder={`Action ${idx + 1}`} />
              <button onClick={() => setActions(actions.filter((_, i) => i !== idx))} className="text-xs text-[#dc2626]">✕</button>
            </div>
          ))}
          <button onClick={() => setActions([...actions, { text: '' }])} className="text-xs text-brand">+ Add action</button>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <label className="block text-sm"><span className={label}>Most appropriate</span>
              <select value={correctMost} onChange={(e) => setCorrectMost(Number(e.target.value))} className={input}>{actions.map((_, i) => <option key={i} value={i}>Action {i + 1}</option>)}</select>
            </label>
            <label className="block text-sm"><span className={label}>Least appropriate</span>
              <select value={correctLeast} onChange={(e) => setCorrectLeast(Number(e.target.value))} className={input}>{actions.map((_, i) => <option key={i} value={i}>Action {i + 1}</option>)}</select>
            </label>
          </div>
        </div>
      ) : null}

      <label className="block text-sm"><span className={label}>Written explanation / rationale</span><textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={3} className={input} /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} /> Publish now</label>

      <div className="flex items-center gap-3">
        <button onClick={submit} disabled={busy || !stem.trim()} className="rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-brand-foreground hover:opacity-90 disabled:opacity-50">
          {busy ? 'Saving…' : 'Create question'}
        </button>
        {msg ? <span className={`text-sm ${msg.startsWith('Error') ? 'text-[#dc2626]' : 'text-success'}`}>{msg}</span> : null}
      </div>
    </div>
  )
}
