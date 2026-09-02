'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { haptic } from '@/lib/haptics'

type Item = { id: string; task: string; theme: string; quotes: number; attempts: number }

// Compact task + theme selector for the "choose a specific topic" flow. Scales to
// many themes without a long card list: pick Task A/B, then a theme, then Write.
export function ThemePicker({
  examSlug,
  subtestSlug,
  prompts,
}: {
  examSlug: string
  subtestSlug: string
  prompts: Item[]
}) {
  const router = useRouter()
  const tasks = useMemo(() => [...new Set(prompts.map((p) => p.task))].sort(), [prompts])
  const [task, setTask] = useState(tasks[0] ?? 'A')
  const forTask = useMemo(() => prompts.filter((p) => p.task === task), [prompts, task])
  const [id, setId] = useState(forTask[0]?.id ?? '')

  // Keep a valid selection when the task changes.
  const selected = forTask.find((p) => p.id === id) ?? forTask[0]
  const currentId = selected?.id ?? ''

  function pickTask(t: string) {
    haptic(6)
    setTask(t)
    const first = prompts.find((p) => p.task === t)
    setId(first?.id ?? '')
  }
  function write() {
    if (!currentId) return
    haptic(10)
    router.push(`/essays/${examSlug}/${subtestSlug}/${currentId}`)
  }

  return (
    <div className="mt-3 rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-end gap-3">
        {/* Task */}
        <div>
          <span className="mb-1 block text-xs font-medium text-muted">Task</span>
          <div className="inline-flex rounded-lg border border-border p-1">
            {tasks.map((t) => (
              <button
                key={t} onClick={() => pickTask(t)}
                className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${task === t ? 'bg-brand text-brand-foreground' : 'text-muted hover:text-foreground'}`}
              >
                Task {t}
              </button>
            ))}
          </div>
        </div>

        {/* Theme */}
        <label className="min-w-[220px] flex-1">
          <span className="mb-1 block text-xs font-medium text-muted">Theme</span>
          <select
            value={currentId} onChange={(e) => setId(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand"
          >
            {forTask.length === 0 ? <option value="">No themes yet</option> : null}
            {forTask.map((p) => (
              <option key={p.id} value={p.id}>
                {p.theme}{p.attempts > 0 ? ` — ${p.attempts} attempt${p.attempts === 1 ? '' : 's'}` : ''}
              </option>
            ))}
          </select>
        </label>

        <button
          onClick={write} disabled={!currentId}
          className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground disabled:opacity-55"
        >
          Write →
        </button>
      </div>
      {selected ? (
        <p className="mt-3 text-xs text-muted">
          {selected.quotes} quote{selected.quotes === 1 ? '' : 's'} · {forTask.length} theme{forTask.length === 1 ? '' : 's'} in Task {task}
        </p>
      ) : null}
    </div>
  )
}
