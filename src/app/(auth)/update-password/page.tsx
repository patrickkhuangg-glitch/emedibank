import type { Metadata } from 'next'
import { requireUser } from '@/lib/auth/dal'
import { UpdatePasswordForm } from './update-form'

export const metadata: Metadata = { title: 'Set a new password' }

export default async function UpdatePasswordPage() {
  // Reached via the emailed reset link, which established a session.
  await requireUser('/update-password')
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Set a new password</h1>
        <p className="mt-1 text-sm text-muted">Choose a new password for your account.</p>
      </div>
      <UpdatePasswordForm />
    </div>
  )
}
