'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { createClient } from '@/lib/supabase/client'

type Enrollment = { factorId: string; qrCode: string; secret: string }

export function AdminMfaForm() {
  const router = useRouter()
  const [factorId, setFactorId] = useState<string | null>(null)
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function loadFactors() {
      const supabase = createClient()
      const { data, error: factorError } = await supabase.auth.mfa.listFactors()
      if (!active) return
      if (factorError) setError('Your authenticator settings could not be loaded. Please try again.')
      else setFactorId(data.totp[0]?.id ?? null)
      setLoading(false)
    }
    void loadFactors()
    return () => { active = false }
  }, [])

  async function beginEnrollment() {
    setSubmitting(true)
    setError('')
    const supabase = createClient()
    const { data: factors } = await supabase.auth.mfa.listFactors()
    for (const factor of factors?.all ?? []) {
      if (factor.factor_type === 'totp' && factor.status === 'unverified') {
        await supabase.auth.mfa.unenroll({ factorId: factor.id })
      }
    }
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Studocyte admin',
      issuer: 'Studocyte',
    })
    if (enrollError) setError('Authenticator setup could not start. Please try again.')
    else {
      setFactorId(data.id)
      setEnrollment({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret })
    }
    setSubmitting(false)
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!factorId) return
    const form = new FormData(event.currentTarget)
    const code = String(form.get('code') ?? '').replace(/\s/g, '')
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the six-digit code from your authenticator app.')
      return
    }
    setSubmitting(true)
    setError('')
    const supabase = createClient()
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
    if (verifyError) {
      setError('That code did not work. Wait for a new code and try again.')
      setSubmitting(false)
      return
    }
    router.replace('/admin')
    router.refresh()
  }

  if (loading) return <p className="mt-6 text-sm text-muted">Checking your security settings…</p>

  return (
    <div className="mt-6 space-y-5">
      {error ? <Alert>{error}</Alert> : null}
      {!factorId ? (
        <div className="space-y-4">
          <p className="text-sm leading-6 text-muted">
            Use Google Authenticator, 1Password, Microsoft Authenticator or another TOTP app. You will scan a QR code, then enter one code to finish.
          </p>
          <Button type="button" className="w-full" onClick={beginEnrollment} disabled={submitting}>
            {submitting ? 'Starting…' : 'Set up authenticator'}
          </Button>
        </div>
      ) : (
        <>
          {enrollment ? (
            <section className="space-y-3 rounded-2xl border border-border bg-surface-muted p-4 text-center">
              <p className="text-sm font-semibold">Scan this code with your authenticator app</p>
              {/* Supabase returns a self-contained SVG for this one-time enrollment view. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Authenticator setup QR code"
                className="mx-auto size-48 rounded-xl bg-white p-2"
                src={`data:image/svg+xml;utf-8,${encodeURIComponent(enrollment.qrCode)}`}
              />
              <details className="text-left text-xs text-muted">
                <summary className="cursor-pointer font-medium">Can&rsquo;t scan it?</summary>
                <p className="mt-2">Enter this setup key manually. Keep it private.</p>
                <code className="mt-2 block select-all break-all rounded-lg bg-surface px-3 py-2 text-foreground">{enrollment.secret}</code>
              </details>
            </section>
          ) : null}
          <form className="space-y-4" onSubmit={verify}>
            <Field label="Six-digit code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required />
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Verifying…' : enrollment ? 'Finish setup' : 'Verify and continue'}
            </Button>
          </form>
        </>
      )}
      <p className="text-xs leading-5 text-muted">
        If you lose access to your authenticator, another verified organisation owner must confirm your identity before resetting the factor in Supabase.
      </p>
    </div>
  )
}
