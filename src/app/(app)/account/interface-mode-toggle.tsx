'use client'
import { useState, useTransition } from 'react'
import { StudocyteMark } from '@/components/ui/studocyte-mark'
import { haptic } from '@/lib/haptics'
import { updateInterfaceModeAction } from './interface-mode-actions'
import type { InterfaceMode } from '@/lib/supabase/types'

const OPTIONS: { value: InterfaceMode; label: string; desc: string }[] = [
  { value: 'playful', label: 'Playful', desc: 'The study-cell mascot and its flourishes.' },
  { value: 'clean', label: 'Clean', desc: 'A faceless, exam-hall mark — no mascot.' },
]

/** Account-wide interface style picker. Optimistic: the selection flips instantly,
 *  the server preference follows. Applied everywhere the user is signed in. */
export function InterfaceModeToggle({ current }: { current: InterfaceMode }) {
  const [mode, setMode] = useState<InterfaceMode>(current)
  const [pending, start] = useTransition()

  function choose(value: InterfaceMode) {
    if (value === mode) return
    haptic(10)
    setMode(value)
    start(() => {
      void updateInterfaceModeAction(value)
    })
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {OPTIONS.map((o) => {
        const active = mode === o.value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => choose(o.value)}
            aria-pressed={active}
            disabled={pending}
            className={`eb-press flex items-center gap-3 rounded-2xl border p-4 text-left transition-all duration-200 disabled:opacity-70 ${
              active ? 'border-brand bg-brand-muted/40 ring-2 ring-brand/25' : 'border-border bg-surface hover:border-brand/40'
            }`}
          >
            <span
              className={`grid h-11 w-11 flex-none place-items-center rounded-xl ${
                o.value === 'clean' ? 'bg-ink text-ink-foreground' : 'bg-brand-muted'
              }`}
            >
              <StudocyteMark variant={o.value} size={24} />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-2">
                <span className="font-medium">{o.label}</span>
                {active ? (
                  <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-foreground">
                    On
                  </span>
                ) : null}
              </span>
              <span className="mt-0.5 block text-xs text-muted">{o.desc}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
