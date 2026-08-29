'use client'
import { useActionState } from 'react'
import { updatePasswordAction, type AuthState } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Alert } from '@/components/ui/alert'

export function UpdatePasswordForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    updatePasswordAction,
    {},
  )
  return (
    <form action={action} className="space-y-4">
      {state.error ? <Alert>{state.error}</Alert> : null}
      <Field
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
      />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Saving…' : 'Update password'}
      </Button>
    </form>
  )
}
