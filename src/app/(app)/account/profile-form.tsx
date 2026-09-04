'use client'

import { useActionState } from 'react'
import { updateProfileAction, type AuthState } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Alert } from '@/components/ui/alert'

export function ProfileForm({ fullName, phoneNumber }: { fullName: string; phoneNumber: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(updateProfileAction, {})
  return <form action={action} className="mt-3 space-y-4 rounded-2xl border border-border bg-surface p-5">
    {state.error ? <Alert>{state.error}</Alert> : null}
    {state.message ? <Alert kind="success">{state.message}</Alert> : null}
    <Field label="Full name" name="full_name" type="text" autoComplete="name" defaultValue={fullName} required />
    <Field label="Mobile number" name="phone_number" type="tel" autoComplete="tel" placeholder="04xx xxx xxx" defaultValue={phoneNumber} required />
    <p className="text-xs leading-5 text-muted">We use this to protect trial access. If you continue after your trial, card details are handled securely by Stripe, not Studocyte.</p>
    <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save details'}</Button>
  </form>
}
