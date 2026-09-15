'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Cyto } from '@/components/ui/cyto'
import { listDrafts } from '@/lib/interviews/mock-local'
import { chooseContinueAction, markFeedbackRead, readContinueState, type ContinueAction, type FeedbackToRead } from '@/lib/interviews/continue-practice'
import styles from './continue-practice.module.css'
export function useInterviewContinue(userId: string | undefined, feedback: FeedbackToRead[]) {
  const [action, setAction] = useState<ContinueAction | null>(null)
  useEffect(() => {
    if (!userId) return
    let alive = true, revision = 0
    const refresh = async () => {
      const request = ++revision
      const drafts = await listDrafts(userId).catch(() => [])
      if (alive && request === revision) setAction(chooseContinueAction(userId, drafts, feedback, readContinueState(userId)))
    }
    void refresh()
    window.addEventListener('focus', refresh); window.addEventListener('storage', refresh); window.addEventListener('interview-continue-changed', refresh)
    return () => { alive = false; window.removeEventListener('focus', refresh); window.removeEventListener('storage', refresh); window.removeEventListener('interview-continue-changed', refresh) }
  }, [userId, feedback])
  return action
}
export function InterviewContinueCard({ action }: { action: ContinueAction }) {
  return <aside className={styles.card} aria-labelledby="continue-interview-title">
    <p className={styles.label}>Continue practice</p>
    <h2 id="continue-interview-title">Pick up where you left off</h2>
    <p className={styles.station}>{action.title}</p>
    <div className={styles.mascot}>
      <Cyto mood="thinking" size={94} title="Cyto keeping your place in the unfinished station" />
      <p><strong>I kept your place.</strong><span>Start again when you’re ready.</span></p>
    </div>
    <Link href={action.href} prefetch={false} data-haptic="soft" className={styles.action}>{action.label}<Arrow /></Link>
  </aside>
}
export function FeedbackReadMarker({ userId, feedbackId }: { userId: string; feedbackId: string }) {
  useEffect(() => { markFeedbackRead(userId, feedbackId) }, [userId, feedbackId])
  return null
}

function Arrow() { return <svg aria-hidden viewBox="0 0 20 20" fill="none" width="16" height="16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10h11M11 5l5 5-5 5" /></svg> }
