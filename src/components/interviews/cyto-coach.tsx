'use client'

import { useState } from 'react'
import type { CytoMood } from '@/lib/mascot/mood'
import { Cyto } from '@/components/ui/cyto'
import styles from './cyto-coach.module.css'

export type CytoNudge = { title: string; body: string }

export function InterviewCytoCoach({
  messages,
  mood = 'thinking',
  label = 'Cyto’s slightly over-prepared note',
}: {
  messages: CytoNudge[]
  mood?: CytoMood
  label?: string
}) {
  const [messageIndex, setMessageIndex] = useState(0)
  const message = messages[messageIndex] ?? messages[0]
  if (!message) return null

  function nextMessage() {
    setMessageIndex((current) => (current + 1) % messages.length)
  }

  return <aside className={styles.coach} aria-label="A practice note from Cyto">
    <div className={styles.stage}>
      <Cyto mood={mood} size={78} title="Cyto, Studocyte’s anxious but hardworking study cell" />
    </div>
    <div className={styles.copy}>
      <span className={styles.label}>{label}</span>
      <h2>{message.title}</h2>
      <p aria-live="polite">{message.body}</p>
    </div>
    {messages.length > 1 ? <button type="button" className={styles.nudge} onClick={nextMessage} data-haptic="soft">
      Another nudge <RefreshIcon />
    </button> : null}
  </aside>
}

function RefreshIcon() {
  return <svg aria-hidden="true" viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15.5 7A6 6 0 1 0 16 11" /><path d="M12 4.5h4v4" /></svg>
}
