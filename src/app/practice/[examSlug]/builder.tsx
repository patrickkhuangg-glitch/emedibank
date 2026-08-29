'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function Builder({
  examSlug,
  subtests,
  tags,
}: {
  examSlug: string
  subtests: { id: string; name: string }[]
  tags: string[]
}) {
  const router = useRouter()
  const [sections, setSections] = useState<string[]>([])
  const [types, setTypes] = useState<string[]>([])
  const [difficulty, setDifficulty] = useState('')
  const [count, setCount] = useState(10)
  const [timed, setTimed] = useState(false)
  const [minutes, setMinutes] = useState(20)

  const toggle = (arr: string[], v: string, set: (x: string[]) => void) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])

  function start() {
    const p = new URLSearchParams()
    p.set('exam', examSlug)
    if (sections.length) p.set('subtests', sections.join(','))
    if (types.length) p.set('tags', types.join(','))
    if (difficulty) p.set('difficulty', difficulty)
    p.set('count', String(count))
    p.set('timed', timed ? '1' : '0')
    p.set('minutes', String(minutes))
    router.push('/session?' + p.toString())
  }

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm transition-colors ${active ? 'border-brand bg-brand text-brand-foreground' : 'border-border bg-surface hover:bg-surface-muted'}`

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Sections</h2>
        <p className="mb-3 text-xs text-muted">None selected = all sections.</p>
        <div className="flex flex-wrap gap-2">
          {subtests.map((s) => (
            <button key={s.id} onClick={() => toggle(sections, s.id, setSections)} className={chip(sections.includes(s.id))}>{s.name}</button>
          ))}
        </div>
      </section>

      {tags.length ? (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Question types</h2>
          <p className="mb-3 text-xs text-muted">None selected = all types.</p>
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <button key={t} onClick={() => toggle(types, t, setTypes)} className={chip(types.includes(t))}>{t}</button>
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-6 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Difficulty</span>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm">
            <option value="">Any</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Number of questions: {count}</span>
          <input type="range" min={1} max={50} value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-full accent-[color:var(--brand)]" />
        </label>
      </div>

      <section className="rounded-xl border border-border bg-surface p-5">
        <label className="flex items-center gap-3 text-sm font-medium">
          <input type="checkbox" checked={timed} onChange={(e) => setTimed(e.target.checked)} />
          Timed session
        </label>
        {timed ? (
          <label className="mt-3 block text-sm">
            <span className="mb-1 block">Time limit: {minutes} min</span>
            <input type="range" min={1} max={120} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="w-full accent-[color:var(--brand)]" />
          </label>
        ) : (
          <p className="mt-2 text-xs text-muted">Untimed — practise at your own pace.</p>
        )}
      </section>

      <button onClick={start} className="w-full rounded-lg bg-brand px-6 py-3 font-semibold text-brand-foreground hover:opacity-90 sm:w-auto">
        Start session →
      </button>
    </div>
  )
}
