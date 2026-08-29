'use client'
import { useActionState } from 'react'
import { signUpAction, type AuthState } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Alert } from '@/components/ui/alert'

export function SignupForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signUpAction, {})
  if (state.message) return <Alert kind="success">{state.message}</Alert>
  return (
    <form action={action} className="space-y-4">
      {state.error ? <Alert>{state.error}</Alert> : null}
      <Field label="Full name" name="full_name" type="text" autoComplete="name" required />
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
      />
      <p className="text-xs text-muted">At least 8 characters. No card required.</p>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Creating account…' : 'Create free account'}
      </Button>
    </form>
  )
}
