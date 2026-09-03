'use client'

import { useActionState } from 'react'
import { INITIAL_WAITLIST_STATE, joinLaunchWaitlist } from '@/lib/waitlist/actions'

export function LaunchWaitlist() {
  const [state, action, pending] = useActionState(joinLaunchWaitlist, INITIAL_WAITLIST_STATE)

  if (state.status === 'success') return <div role="status" className="rounded-2xl border border-brand/20 bg-surface px-5 py-4 text-sm font-medium text-foreground">{state.message}</div>

  return <form action={action} className="w-full" noValidate>
    <label htmlFor="launch-email" className="sr-only">Email address</label>
    <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute left-[-10000px] h-px w-px opacity-0" />
    <div className="flex flex-col gap-2.5 sm:flex-row">
      <input id="launch-email" name="email" type="email" inputMode="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" aria-describedby={state.status === 'error' ? 'launch-email-error' : 'launch-email-note'} className="min-h-12 min-w-0 flex-1 rounded-full border border-border bg-surface px-5 text-base text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted/70 focus:border-brand focus:ring-4 focus:ring-brand/10" />
      <button type="submit" disabled={pending} className="eb-press min-h-12 whitespace-nowrap rounded-full bg-brand px-6 font-semibold text-brand-foreground transition-[transform,opacity] hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60">{pending ? 'Joining...' : 'Notify me'}</button>
    </div>
    {state.status === 'error' ? <p id="launch-email-error" role="alert" className="mt-2 text-sm font-medium text-[#b42318]">{state.message}</p> : <p id="launch-email-note" className="mt-3 text-xs leading-5 text-muted">Opening updates and the launch offer only. Unsubscribe at any time.</p>}
  </form>
}

