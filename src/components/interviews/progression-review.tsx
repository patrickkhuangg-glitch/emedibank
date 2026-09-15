'use client'

import Link from 'next/link'
import { useState } from 'react'
import { trackAnalyticsEvent } from '@/components/analytics'
import { practiceButtonPrimary, practiceButtonSecondary } from './practice-buttons'

export function InterviewProgressionReview({ attemptId, transcriptReady, stationId, format }: { attemptId: string; transcriptReady: boolean; stationId: string; format: 'mmi' | 'panel' }) {
  const [reviewed, setReviewed] = useState(false), [evidence, setEvidence] = useState(''), [pending, setPending] = useState<'review' | 'demonstrate' | null>(null), [message, setMessage] = useState('')
  async function act(action: 'review' | 'demonstrate') {
    if (pending) return
    setPending(action); setMessage('')
    try {
      const response = await fetch('/api/interviews/progression', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attemptId, action, evidence: action === 'demonstrate' ? evidence : undefined }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'This progression step could not be saved.')
      if (action === 'review') setReviewed(true)
      setMessage(action === 'review' ? `Review complete${payload.xp ? ` · +${payload.xp} XP` : ''}. Retry the same scenario with your Feedback Quest in mind.` : `Improvement evidence saved${payload.xp ? ` · +${payload.xp} XP` : ''}${payload.focusTokens ? ` · +${payload.focusTokens} Focus ${payload.focusTokens === 1 ? 'Token' : 'Tokens'}` : ''}.`)
      trackAnalyticsEvent(action === 'review' ? 'interview_progression_reviewed' : 'interview_progression_improvement_recorded', { format, status: String(payload.status) })
    } catch (error) { setMessage(error instanceof Error ? error.message : 'This progression step could not be saved.') }
    finally { setPending(null) }
  }
  const retryHref = `/interviews/practice/session?format=${format}&station=${encodeURIComponent(stationId)}&daily=1`
  return <section className="rounded-2xl border border-brand/20 bg-brand-muted/35 p-5" aria-labelledby="progression-review-title">
    <p className="text-[11px] font-bold uppercase tracking-[.08em] text-brand">Daily Station progression</p>
    <h3 id="progression-review-title" className="mt-2 font-display text-xl font-semibold">Turn this attempt into the next one</h3>
    <p className="mt-2 text-sm leading-6 text-muted">Read the transcript and any available feedback actively. Then retry the same scenario with one observable behaviour in mind.</p>
    {!reviewed ? <button data-haptic="confirm" type="button" disabled={!transcriptReady || !!pending} onClick={() => act('review')} className={`mt-4 ${practiceButtonPrimary}`}>{pending === 'review' ? 'Saving review…' : transcriptReady ? 'I’ve reviewed this response' : 'Available when the transcript is ready'}</button> : <Link data-haptic="confirm" href={retryHref} className={`mt-4 ${practiceButtonPrimary}`}>Retry the same scenario →</Link>}
    <details className="mt-4 border-t border-brand/15 pt-4"><summary className="cursor-pointer text-sm font-semibold text-brand">Already completed the targeted retry?</summary><label className="mt-3 block text-sm font-medium" htmlFor={`improvement-${attemptId}`}>Paste a short transcript excerpt or describe the observable change</label><textarea id={`improvement-${attemptId}`} value={evidence} maxLength={500} rows={3} onChange={event => setEvidence(event.target.value)} className="mt-2 w-full rounded-xl border border-border bg-surface p-3 text-sm leading-6 focus-visible:outline-2 focus-visible:outline-brand" placeholder="For example: I acknowledged the patient’s concern before explaining the next step." /><div className="mt-3 flex items-center justify-between gap-3"><span className="text-xs text-muted">{evidence.length}/500</span><button data-haptic="confirm" type="button" disabled={evidence.trim().length < 12 || !!pending} onClick={() => act('demonstrate')} className={practiceButtonSecondary}>{pending === 'demonstrate' ? 'Saving…' : 'Save improvement evidence'}</button></div></details>
    {message && <p role="status" className="mt-3 text-sm font-medium text-muted">{message}</p>}
  </section>
}
