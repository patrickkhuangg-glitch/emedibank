'use client'

import { useRef, useState } from 'react'

export function InterviewSelfRating({ activityId, initialRating = null }: { activityId: string; initialRating?: number | null }) {
  const [rating, setRating] = useState(initialRating), [pending, setPending] = useState(false), [message, setMessage] = useState('')
  const lock = useRef(false)
  async function save(value: number | null) {
    if (lock.current) return
    lock.current = true; setPending(true); setMessage('')
    try {
      const response = await fetch(`/api/interviews/practice/${activityId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'rate', rating: value }) })
      if (!response.ok) throw new Error()
      setRating(value); setMessage(value === null ? 'Rating removed.' : 'Self-rating saved to your weekly summary.')
    } catch { setMessage('Your rating could not be saved. Please try again.') }
    finally { lock.current = false; setPending(false) }
  }
  return <section className="border-t border-border pt-5" aria-label="Rate your practice">
    <h3 className="font-semibold">How did that response feel?</h3>
    <p className="mt-1 text-sm leading-6 text-muted">Your self-rating helps plan your next practice. It is separate from tutor feedback.</p>
    <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Self-rating out of 5">{[1, 2, 3, 4, 5].map(value => <button key={value} type="button" disabled={pending} onClick={() => save(value)} aria-pressed={rating === value} aria-label={`Rate ${value} out of 5`} className={`min-h-11 min-w-11 rounded-xl border px-3 py-2 font-semibold tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50 ${rating === value ? 'border-brand bg-brand text-brand-foreground' : 'border-border bg-surface hover:bg-brand-muted'}`}>{value}</button>)}</div>
    <div className="mt-2 flex max-w-64 justify-between text-xs text-muted"><span>1 · Needs work</span><span>5 · Felt strong</span></div>
    {rating !== null && <button type="button" disabled={pending} onClick={() => save(null)} className="mt-2 min-h-11 text-sm text-muted underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-brand">Remove rating</button>}
    <p role="status" className="mt-2 min-h-5 text-xs text-muted">{pending ? 'Saving rating…' : message || 'Optional — you can leave this unrated.'}</p>
  </section>
}
