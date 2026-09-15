'use client'

import { useActionState } from 'react'
import { completeProfileAction, type AuthState } from '@/lib/auth/actions'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'

export function CompleteProfileForm({ fullName, next }: { fullName: string; next?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(completeProfileAction, {})
  return (
    <form action={action} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {state.error ? <Alert>{state.error}</Alert> : null}
      <Field label="Full name" name="full_name" type="text" autoComplete="name" defaultValue={fullName} required />
      <Field label="Mobile number" name="phone_number" type="tel" inputMode="tel" autoComplete="tel" placeholder="04xx xxx xxx" required />
      <p className="text-xs leading-5 text-muted">
        Australian mobile numbers can start with 04. International numbers should include their country code, such as +64.
      </p>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Saving…' : 'Continue to Studocyte'}
      </Button>
    </form>
  )
}
