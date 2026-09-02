'use client'
import { useState } from 'react'
import { topUpCreditsAction } from '@/lib/essays/actions'

export function TopUpForm() {
  const [email, setEmail] = useState('')
  const [amount, setAmount] = useState(20)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function submit() {
    if (busy || !email.trim()) return
    setBusy(true); setMsg(null)
    const r = await topUpCreditsAction(email, amount)
    setBusy(false)
    setMsg(r.ok ? `Done — ${email.trim()} now has ${r.balance} credits.` : (r.error ?? 'Failed.'))
    if (r.ok) setEmail('')
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex-1 min-w-[220px] text-sm">
          <span className="mb-1 block text-xs font-medium text-muted">Student email</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="student@example.com"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-muted">Credits</span>
          <input value={amount} onChange={(e) => setAmount(Number(e.target.value))} type="number" min={1}
            className="w-24 rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand" />
        </label>
        <button onClick={submit} disabled={busy || !email.trim()} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground disabled:opacity-55">
          {busy ? 'Granting…' : 'Grant'}
        </button>
      </div>
      {msg ? <p className="mt-2 text-sm text-muted">{msg}</p> : null}
    </div>
  )
}
