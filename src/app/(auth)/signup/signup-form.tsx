'use client'
import { useActionState, useState } from 'react'
import { signUpAction, type AuthState } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Alert } from '@/components/ui/alert'
import { Turnstile } from '@/components/ui/turnstile'
import { trackAnalyticsEvent } from '@/components/analytics'

export function SignupForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signUpAction, {})
  const [turnstileToken, setTurnstileToken] = useState('')
  if (state.message) return <Alert kind="success">{state.message}</Alert>
  return (
    <form action={action} className="space-y-4" onSubmit={() => trackAnalyticsEvent('signup_started', { method: 'email' })}>
      {state.error ? <Alert>{state.error}</Alert> : null}
      <Field label="Full name" name="full_name" type="text" autoComplete="name" required />
      <Field label="Mobile number" name="phone_number" type="tel" autoComplete="tel" placeholder="04xx xxx xxx" required />
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
      />
      <input type="hidden" name="turnstileToken" value={turnstileToken} />
      <Turnstile onTokenChange={setTurnstileToken} />
      <p className="text-xs leading-5 text-muted">Verify your email, then choose a plan. If you continue after the 7-day trial, card details are collected securely by Stripe.</p>
      <Button type="submit" className="w-full" disabled={pending || !turnstileToken}>
        {pending ? 'Creating account…' : 'Create free account'}
      </Button>
    </form>
  )
}
