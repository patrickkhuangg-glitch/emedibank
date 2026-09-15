'use client'

import type { PointerEvent, ReactNode } from 'react'
import { haptic } from '@/lib/haptics'

const strengths = { soft: 6, standard: 9, confirm: 15 } as const

export function InterviewInteractionLayer({ children }: { children: ReactNode }) {
  function acknowledge(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse') return
    const target = event.target instanceof Element
      ? event.target.closest<HTMLElement>('a, button, summary, select, [role="button"], input[type="checkbox"], input[type="radio"]')
      : null
    if (!target || target.dataset.haptic === 'off' || target.dataset.hapticHandled === 'true') return
    if (target.matches(':disabled, [aria-disabled="true"]')) return
    haptic(strengths[target.dataset.haptic as keyof typeof strengths] ?? strengths.standard)
  }

  return <div className="interview-interaction-layer" onPointerDownCapture={acknowledge}>{children}</div>
}
