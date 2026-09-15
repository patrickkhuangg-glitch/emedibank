import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AdminMfaForm } from './admin-mfa-form'
import { adminMfaIsVerified } from '@/lib/auth/admin-mfa'
import { getProfile, requireUser } from '@/lib/auth/dal'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Secure admin access · Studocyte' }

export default async function AdminMfaPage() {
  await requireUser('/admin')
  const profile = await getProfile()
  if (profile?.role !== 'admin') redirect('/dashboard')
  if (await adminMfaIsVerified()) redirect('/admin')

  return (
    <main>
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.15em] text-brand">Admin security</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">Verify it&rsquo;s you</h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        Administrator tools require a fresh code from your authenticator app.
      </p>
      <AdminMfaForm />
    </main>
  )
}
