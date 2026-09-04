'use client'

import { useActionState, useEffect, useRef } from 'react'
import { createTutoringSessionAction, type CreateTutoringSessionState } from '@/lib/tutoring/actions'

type TutoringItem = { id: string; title: string; exam_scope: string | null; total_units: number; used_units: number }

export function CreateTutoringSessionForm({ planId, items }: { planId: string; items: TutoringItem[] }) {
  const [state, action, pending] = useActionState<CreateTutoringSessionState, FormData>(createTutoringSessionAction, {})
  const formRef = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (state.message) formRef.current?.reset()
  }, [state.message])

  return <form ref={formRef} action={action} className="mt-6 grid gap-4 sm:grid-cols-2">
    <input type="hidden" name="planId" value={planId}/>
    <DarkLabel label="Tutoring inclusion">
      <select required name="planItemId" className="field-dark">
        <option value="">Choose hours to use</option>
        {items.map((item) => <option key={item.id} value={item.id}>{item.title}{item.exam_scope ? ` · ${item.exam_scope}` : ''} · {formatHours(item.total_units - item.used_units)} left</option>)}
      </select>
    </DarkLabel>
    <DarkLabel label="Booked length">
      <select required name="bookedMinutes" defaultValue="60" className="field-dark">
        <option value="30">30 minutes</option>
        <option value="45">45 minutes</option>
        <option value="60">1 hour</option>
        <option value="90">1.5 hours</option>
        <option value="120">2 hours</option>
        <option value="150">2.5 hours</option>
        <option value="180">3 hours</option>
      </select>
    </DarkLabel>
    <DarkLabel label="Session title">
      <input required name="title" placeholder="e.g. UCAT decision making" className="field-dark"/>
    </DarkLabel>
    <DarkLabel label="Start time (Brisbane)">
      <input required type="datetime-local" name="scheduledFor" className="field-dark"/>
    </DarkLabel>
    <p className="sm:col-span-2 text-xs leading-5 text-white/65">The booked time is automatically deducted once Zoom confirms the student attended—even if they join late. Any time beyond the booking is held for your approval.</p>
    {state.error ? <p role="alert" className="sm:col-span-2 rounded-2xl bg-white/10 px-4 py-3 text-sm leading-6 text-white">{state.error}</p> : null}
    {state.message ? <p role="status" className="sm:col-span-2 rounded-2xl bg-mint-muted px-4 py-3 text-sm leading-6 text-mint-deep">{state.message}</p> : null}
    <div className="sm:col-span-2"><button type="submit" disabled={pending} className="eb-press inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-ink transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">{pending ? 'Creating Zoom session…' : 'Schedule Zoom session'}</button></div>
  </form>
}

function DarkLabel({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-sm font-semibold text-white"><span>{label}</span><span className="mt-2 block">{children}</span></label> }
function formatHours(value: number) { return `${Number.isInteger(value) ? value : value.toFixed(2)} h` }
