'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CategoryStat } from '@/lib/practice/stats'

/**
 * Category list for one section. Selecting a category expands an inline config
 * (length + timing), then launches the shared session runner with that section
 * and tag pre-applied.
 */
export function CategoryPicker({
  examSlug,
  subtestId,
  categories,
}: {
  examSlug: string
  subtestId: string
  categories: CategoryStat[]
}) {
  const router = useRouter()
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [count, setCount] = useState(10)
  const [timed, setTimed] = useState(false)
  const [minutes, setMinutes] = useState(20)

  function select(cat: CategoryStat) {
    if (cat.total === 0) return
    setOpenKey(cat.key)
    setCount(Math.min(10, cat.total))
  }

  function start(cat: CategoryStat) {
    const p = new URLSearchParams()
    p.set('exam', examSlug)
    p.set('subtests', subtestId)
    if (cat.key) p.set('tags', cat.key)
    p.set('count', String(count))
    p.set('timed', timed ? '1' : '0')
    p.set('minutes', String(minutes))
    router.push('/session?' + p.toString())
  }

  return (
    <ul className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
      {categories.map((cat, idx) => {
        const open = openKey === cat.key
        const disabled = cat.total === 0
        const pct = cat.total ? Math.round((cat.attempted / cat.total) * 100) : 0
        return (
          <li key={cat.key || '__all'} className="eb-rise" style={{ animationDelay: `${idx * 45}ms` }}>
            <button
              onClick={() => (open ? setOpenKey(null) : select(cat))}
              disabled={disabled}
              aria-expanded={open}
              className={`group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors ${
                disabled ? 'cursor-default' : 'hover:bg-surface-muted'
              }`}
            >
              <span
                className={`grid h-11 w-11 flex-none place-items-center rounded-xl transition-transform duration-300 ${
                  disabled ? 'bg-surface-muted text-muted' : 'bg-brand-muted text-brand group-hover:scale-105'
                }`}
              >
                <BookIcon />
              </span>
              <div className="min-w-0 flex-1">
                <span className={`font-medium ${disabled ? 'text-muted' : ''}`}>{cat.label}</span>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className="eb-bar h-full rounded-full bg-brand"
                    style={{ width: `${pct}%`, animationDelay: `${idx * 45 + 120}ms` }}
                  />
                </div>
              </div>
              <span className="hidden flex-none tabular-nums text-sm text-muted sm:block">
                {cat.attempted} / {cat.total} completed
              </span>
              {disabled ? (
                <span className="flex-none rounded-full bg-surface-muted px-2.5 py-1 text-[11px] font-medium text-muted">
                  Coming soon
                </span>
              ) : (
                <svg
                  width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className={`flex-none text-muted transition-transform duration-300 ${open ? 'rotate-90' : ''}`}
                  aria-hidden
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              )}
            </button>

            {open ? (
              <div className="eb-expand border-t border-border bg-surface-muted/40 px-5 py-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium">Number of questions: {count}</span>
                    <input
                      type="range"
                      min={1}
                      max={Math.max(1, cat.total)}
                      value={count}
                      onChange={(e) => setCount(Number(e.target.value))}
                      className="w-full accent-[color:var(--brand)]"
                    />
                    <span className="mt-1 block text-xs text-muted">{cat.total} available</span>
                  </label>
                  <div className="text-sm">
                    <label className="flex items-center gap-2 font-medium">
                      <input type="checkbox" checked={timed} onChange={(e) => setTimed(e.target.checked)} />
                      Timed session
                    </label>
                    {timed ? (
                      <label className="mt-2 block">
                        <span className="mb-1 block text-xs">Time limit: {minutes} min</span>
                        <input
                          type="range"
                          min={1}
                          max={120}
                          value={minutes}
                          onChange={(e) => setMinutes(Number(e.target.value))}
                          className="w-full accent-[color:var(--brand)]"
                        />
                      </label>
                    ) : (
                      <p className="mt-2 text-xs text-muted">Untimed. Practise at your own pace.</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => start(cat)}
                  className="mt-5 w-full rounded-lg bg-brand px-6 py-3 font-semibold text-brand-foreground hover:opacity-90 sm:w-auto"
                >
                  Start session →
                </button>
              </div>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

function BookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v15H5.5A1.5 1.5 0 0 0 4 20.5z" />
      <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v15h5.5a1.5 1.5 0 0 1 1.5 1.5z" />
    </svg>
  )
}
