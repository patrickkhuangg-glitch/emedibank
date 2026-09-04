'use client'

import { useEffect } from 'react'
import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { createStudyPlanAction, type CreateStudyPlanState } from '@/lib/study-plans/actions'

export function CreateStudyPlanForm() {
  const router = useRouter()
  const [state, action, pending] = useActionState<CreateStudyPlanState, FormData>(createStudyPlanAction, {})
  useEffect(() => {
    if (state.planId) router.push(`/admin/study-plans/${state.planId}`)
  }, [router, state.planId])

  return <form action={action} className="mt-6 space-y-4">
    <Field label="Student email"><input required type="email" name="studentEmail" autoComplete="email" placeholder="student@email.com" className="field-dark" /></Field>
    <Field label="Package name"><input required name="name" placeholder="e.g. UCAT + interview tutoring" className="field-dark" /></Field>
    {state.error ? <p role="alert" className="rounded-2xl bg-white/10 px-4 py-3 text-sm leading-6 text-white">{state.error}</p> : null}
    <p className="text-xs leading-5 text-white/60">The student needs a Studocyte account first. You can create one from Students.</p>
    <button type="submit" disabled={pending} className="eb-press inline-flex w-full items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-ink transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">{pending ? 'Creating package…' : 'Create package'}</button>
  </form>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-sm font-semibold text-white"><span>{label}</span><span className="mt-2 block">{children}</span></label> }
