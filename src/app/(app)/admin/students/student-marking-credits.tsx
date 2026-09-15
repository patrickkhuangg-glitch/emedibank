'use client'

import { useActionState, useRef, useState } from 'react'
import { addMarkingCreditsAction, type MarkingCreditState } from '@/lib/admin/marking-credit-actions'

export function StudentMarkingCredits({ userId, name, essayCredits, interviewCredits }: { userId: string; name: string; essayCredits: number; interviewCredits: number }) {
  const [essay, setEssay] = useState('0')
  const [interview, setInterview] = useState('0')
  const [note, setNote] = useState('')
  const request = useRef<{ entry: string; id: string } | null>(null)
  const submitting = useRef(false)
  const [state, action, pending] = useActionState<MarkingCreditState, FormData>(async (previous, formData) => {
    const entry = JSON.stringify([userId, formData.get('essayAmount'), formData.get('interviewAmount'), formData.get('note')])
    if (!request.current || request.current.entry !== entry) request.current = { entry, id: crypto.randomUUID() }
    formData.set('requestId', request.current.id)
    try {
      const result = await addMarkingCreditsAction(previous, formData)
      if (result.message) {
        setEssay('0'); setInterview('0'); setNote(''); request.current = null
      }
      return result
    } catch {
      return { error: 'The connection was interrupted. Retry this entry safely; it will only be added once.' }
    } finally { submitting.current = false }
  }, {})

  return <details className="group/credits mt-4 rounded-2xl border border-border bg-surface open:bg-brand-muted/20">
    <summary className="flex min-h-12 cursor-pointer list-none flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm outline-none transition-colors hover:bg-brand-muted/40 focus-visible:ring-2 focus-visible:ring-brand/40 [&::-webkit-details-marker]:hidden">
      <span className="font-semibold">Marking credits <span className="sr-only">for {name}</span></span>
      <span className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-brand-muted px-3 py-1 text-xs font-semibold text-brand">Essay <span className="tabular-nums">{essayCredits}</span></span>
        <span className="rounded-full bg-brand-muted px-3 py-1 text-xs font-semibold text-brand">Interview <span className="tabular-nums">{interviewCredits}</span></span>
        <span className="text-xs font-semibold text-brand">Add credits <span aria-hidden className="inline-block transition-transform group-open/credits:rotate-45">+</span></span>
      </span>
    </summary>
    <form action={action} onSubmit={event => { if (submitting.current) event.preventDefault(); else submitting.current = true }} className="border-t border-border px-4 py-4">
      <input type="hidden" name="userId" value={userId} />
      <p className="text-xs leading-5 text-muted">Add to {name}&rsquo;s existing balance. Enter 0 for a credit type you don&rsquo;t want to add.</p>
      <fieldset disabled={pending} className="mt-3 grid gap-3 sm:grid-cols-2 disabled:opacity-60">
        <label className="text-xs font-semibold">Essay marking credits to add<input name="essayAmount" type="number" min="0" max="10000" step="1" required value={essay} onChange={event => setEssay(event.target.value)} className="mt-1.5 block h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand/40" /></label>
        <label className="text-xs font-semibold">Interview marking credits to add<input name="interviewAmount" type="number" min="0" max="10000" step="1" required value={interview} onChange={event => setInterview(event.target.value)} className="mt-1.5 block h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand/40" /></label>
        <label className="text-xs font-semibold sm:col-span-2">Admin note <span className="font-normal text-muted">(optional)</span><input name="note" maxLength={500} value={note} onChange={event => setNote(event.target.value)} placeholder="e.g. Additional credits included in their package" className="mt-1.5 block h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-brand/40" /></label>
      </fieldset>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending || !(Number(essay) > 0 || Number(interview) > 0)} aria-label={`Add marking credits for ${name}`} className="eb-press min-h-10 rounded-full bg-brand px-5 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50">{pending ? 'Adding credits…' : 'Add marking credits'}</button>
        <p className="text-xs text-muted">Adds credits without taking a payment.</p>
      </div>
      {state.error || state.message ? <p role={state.error ? 'alert' : 'status'} className={`mt-3 text-sm leading-6 ${state.error ? 'text-red-700' : 'text-mint-deep'}`}>{state.error ?? state.message}</p> : null}
    </form>
  </details>
}
