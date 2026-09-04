'use client'

import { useActionState, useMemo, useState } from 'react'
import { createTutoringSessionAction, type CreateTutoringSessionState } from '@/lib/tutoring/actions'

export type BookingPlanOption = {
  id: string
  name: string
  studentName: string
  studentEmail: string
  inclusions: Array<{ id: string; title: string; remainingHours: number }>
}

const initialState: CreateTutoringSessionState = {}

export function BookingForm({ plans }: { plans: BookingPlanOption[] }) {
  const [planId, setPlanId] = useState(plans[0]?.id ?? '')
  const [state, formAction, pending] = useActionState(createTutoringSessionAction, initialState)
  const selectedPlan = useMemo(() => plans.find((plan) => plan.id === planId), [planId, plans])

  if (plans.length === 0) {
    return <p className="mt-5 rounded-2xl bg-white/10 px-4 py-3 text-sm leading-6 text-white/75">There are no active student packages with tutoring hours remaining. Add an hours-based tutoring inclusion before booking a lesson.</p>
  }

  return (
    <form action={formAction} className="mt-6 grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="planId" value={planId} />
      <label className="block text-sm font-semibold text-white sm:col-span-2">
        <span>Student package</span>
        <select value={planId} onChange={(event) => setPlanId(event.target.value)} className="field-dark mt-2">
          {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.studentName} · {plan.name}</option>)}
        </select>
        {selectedPlan ? <span className="mt-2 block text-xs font-normal text-white/60">{selectedPlan.studentEmail}</span> : null}
      </label>
      <label className="block text-sm font-semibold text-white">
        <span>Tutoring inclusion</span>
        <select key={planId} required name="planItemId" className="field-dark mt-2">
          {(selectedPlan?.inclusions ?? []).map((item) => <option key={item.id} value={item.id}>{item.title} · {formatHours(item.remainingHours)} left</option>)}
        </select>
      </label>
      <label className="block text-sm font-semibold text-white">
        <span>Lesson title</span>
        <input required name="title" placeholder="e.g. UCAT decision making" className="field-dark mt-2" />
      </label>
      <label className="block text-sm font-semibold text-white">
        <span>Date and time (Brisbane)</span>
        <input required type="datetime-local" name="scheduledFor" className="field-dark mt-2" />
      </label>
      <label className="block text-sm font-semibold text-white">
        <span>Booked length</span>
        <select name="bookedMinutes" defaultValue="60" className="field-dark mt-2"><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">1 hour</option><option value="90">1 hour 30 min</option><option value="120">2 hours</option></select>
      </label>
      <div className="sm:col-span-2">
        {state.error ? <p role="alert" className="mb-3 rounded-xl bg-danger/15 px-4 py-3 text-sm text-danger-foreground">{state.error}</p> : null}
        {state.message ? <p role="status" className="mb-3 rounded-xl bg-mint-muted px-4 py-3 text-sm text-mint-deep">{state.message}</p> : null}
        <button disabled={pending} type="submit" className="eb-press rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-ink transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70">{pending ? 'Creating Zoom lesson…' : 'Book lesson'}</button>
      </div>
    </form>
  )
}

function formatHours(value: number) {
  return `${Number.isInteger(value) ? value : value.toFixed(1)} h`
}
