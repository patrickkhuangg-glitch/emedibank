'use client'
import { useState, type ReactNode } from 'react'
import { haptic } from '@/lib/haptics'

/** Two-tab switcher on the practice page: start a new session vs. review history.
 *  Panels are server-rendered and handed in as props. */
export function PracticeTabs({
  newSession,
  history,
  historyCount,
}: {
  newSession: ReactNode
  history: ReactNode
  historyCount: number
}) {
  const [tab, setTab] = useState<'new' | 'history'>('new')
  const tabCls = (active: boolean) =>
    `eb-press relative rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 ${
      active ? 'bg-brand text-brand-foreground shadow-sm' : 'text-muted hover:text-foreground'
    }`
  return (
    <div className="mt-8">
      <div className="inline-flex items-center gap-1 rounded-full border border-border bg-surface p-1">
        <button onClick={() => { haptic(8); setTab('new') }} className={tabCls(tab === 'new')}>
          New session
        </button>
        <button onClick={() => { haptic(8); setTab('history') }} className={tabCls(tab === 'history')}>
          History{historyCount > 0 ? ` (${historyCount})` : ''}
        </button>
      </div>
      <div className="mt-4">{tab === 'new' ? newSession : history}</div>
    </div>
  )
}
