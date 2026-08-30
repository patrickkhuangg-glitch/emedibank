'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { importQuestions, type ImportResult } from '@/lib/admin/import-actions'

export function ImportForm() {
  const router = useRouter()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) setText(await f.text())
  }
  async function run() {
    setBusy(true); setResult(null)
    try { setResult(await importQuestions(text)) }
    catch (err) { setResult({ created: 0, stimuli: 0, errors: [{ row: 0, message: err instanceof Error ? err.message : 'import failed' }] }) }
    setBusy(false)
    router.refresh()
  }

  const input = 'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm'
  return (
    <div className="space-y-4">
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Upload a .csv / .tsv file</span>
        <input type="file" accept=".csv,.tsv,text/csv,text/tab-separated-values" onChange={onFile} className="text-sm" />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">…or paste the rows (including the header row)</span>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={10} className={`${input} font-mono text-xs`} placeholder="exam,subtest,stimulus_key,passage,…" />
      </label>
      <button onClick={run} disabled={busy || !text.trim()} className="rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-brand-foreground hover:opacity-90 disabled:opacity-50">
        {busy ? 'Importing…' : 'Import questions'}
      </button>

      {result ? (
        <div className="rounded-lg border border-border bg-surface p-4 text-sm">
          <p className="font-medium text-success">Created {result.created} question{result.created === 1 ? '' : 's'} · {result.stimuli} stimul{result.stimuli === 1 ? 'us' : 'i'}.</p>
          {result.errors.length ? (
            <div className="mt-3">
              <p className="font-medium text-[#dc2626]">{result.errors.length} row{result.errors.length === 1 ? '' : 's'} skipped:</p>
              <ul className="mt-1 space-y-0.5 text-xs text-muted">
                {result.errors.slice(0, 30).map((e, i) => <li key={i}>Row {e.row}: {e.message}</li>)}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
