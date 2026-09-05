'use client'

import { useActionState, useEffect, useRef } from 'react'
import { inviteStudentAction, type InviteStudentState } from '@/lib/admin/student-actions'

export function InviteStudentForm() {
  const [state, action, pending] = useActionState<InviteStudentState, FormData>(inviteStudentAction, {})
  const formRef = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (state.message) formRef.current?.reset()
  }, [state.message])

  return <form ref={formRef} action={action} className="mt-6 space-y-4">
    <label className="block text-sm font-semibold text-white"><span>Account type</span><select name="accountRole" defaultValue="student" className="field-dark mt-2"><option value="student">Student</option><option value="tutor">Tutor</option></select></label>
    <label className="block text-sm font-semibold text-white"><span>Full name</span><input required name="fullName" autoComplete="name" placeholder="e.g. Jordan Smith" className="field-dark mt-2" /></label>
    <label className="block text-sm font-semibold text-white"><span>Email address</span><input required type="email" name="email" autoComplete="email" placeholder="student@email.com" className="field-dark mt-2" /></label>
    <label className="block text-sm font-semibold text-white"><span>Mobile number</span><input required type="tel" name="phoneNumber" autoComplete="tel" placeholder="04xx xxx xxx" className="field-dark mt-2" /></label>
    {state.error ? <p role="alert" className="rounded-2xl bg-white/10 px-4 py-3 text-sm leading-6 text-white">{state.error}</p> : null}
    {state.message ? <p role="status" className="rounded-2xl bg-mint-muted px-4 py-3 text-sm leading-6 text-mint-deep">{state.message}</p> : null}
    <button type="submit" disabled={pending} className="eb-press inline-flex w-full items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-ink transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">{pending ? 'Creating account…' : 'Create account & send invite'}</button>
  </form>
}
