'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { sendAccountAccessAction } from '@/lib/admin/student-actions'

export function AccountAccessActions({ userId, email }: { userId: string; email: string }) {
  const [loginState, loginAction, loginPending] = useActionState(sendAccountAccessAction, {})
  const [passwordState, passwordAction, passwordPending] = useActionState(sendAccountAccessAction, {})
  const [activeDelivery, setActiveDelivery] = useState<'login' | 'password' | null>(null)
  const state = activeDelivery === 'login' ? loginState : activeDelivery === 'password' ? passwordState : {}
  const sending = loginPending || passwordPending

  return <div className="min-w-0">
    <div className="flex flex-wrap gap-2">
      <AccessForm action={loginAction} userId={userId} email={email} delivery="login" label="Send login link" pendingLabel="Sending…" disabled={sending} onSubmit={() => setActiveDelivery('login')} primary />
      <AccessForm action={passwordAction} userId={userId} email={email} delivery="password" label="Password link" pendingLabel="Sending…" disabled={sending} onSubmit={() => setActiveDelivery('password')} />
    </div>
    {state.error || state.message ? <p role={state.error ? 'alert' : 'status'} className={`mt-2 max-w-sm text-xs font-semibold leading-5 ${state.error ? 'text-red-700' : 'text-mint-deep'}`}>{state.error ?? state.message}</p> : null}
  </div>
}

function AccessForm({ action, userId, email, delivery, label, pendingLabel, disabled, onSubmit, primary = false }: { action: (formData: FormData) => void; userId: string; email: string; delivery: 'login' | 'password'; label: string; pendingLabel: string; disabled: boolean; onSubmit: () => void; primary?: boolean }) {
  return <form action={action} onSubmit={onSubmit}><input type="hidden" name="userId" value={userId} /><input type="hidden" name="email" value={email} /><input type="hidden" name="delivery" value={delivery} /><SubmitButton label={label} pendingLabel={pendingLabel} disabled={disabled} recipient={email} primary={primary} /></form>
}

function SubmitButton({ label, pendingLabel, disabled, recipient, primary }: { label: string; pendingLabel: string; disabled: boolean; recipient: string; primary: boolean }) {
  const { pending } = useFormStatus()
  return <button type="submit" aria-label={`${label} for ${recipient}`} disabled={disabled} className={`eb-press inline-flex min-h-9 items-center justify-center rounded-full px-3.5 text-xs font-semibold transition-colors disabled:cursor-wait disabled:opacity-60 ${primary ? 'bg-brand text-brand-foreground' : 'border border-border bg-surface text-foreground hover:border-brand/30 hover:bg-brand-muted'}`}>{pending ? pendingLabel : label}</button>
}
