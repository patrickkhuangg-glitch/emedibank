'use client'
import { useId, useState, type ReactNode } from 'react'
import styles from '@/components/workspace/practice-library.module.css'
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
  const panelId = useId()
  return (
    <div className={styles.tabs}>
      <div className={styles.tabBar} role="group" aria-label="Practice view">
        <button onClick={() => { haptic(8); setTab('new') }} aria-pressed={tab === 'new'} aria-controls={panelId}>
          New session
        </button>
        <button onClick={() => { haptic(8); setTab('history') }} aria-pressed={tab === 'history'} aria-controls={panelId}>
          History{historyCount > 0 ? ` (${historyCount})` : ''}
        </button>
      </div>
      <div id={panelId} className={styles.tabContent}>{tab === 'new' ? newSession : history}</div>
    </div>
  )
}
