import type { Metadata } from 'next'
import Link from 'next/link'
import { ResetForm } from './reset-form'

export const metadata: Metadata = { title: 'Reset password' }

export default function ResetPasswordPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Reset your password</h1>
        <p className="mt-1 text-sm text-muted">
          Enter your email and we&rsquo;ll send a link to set a new password.
        </p>
      </div>
      <ResetForm />
      <p className="text-center text-sm text-muted">
        <Link href="/login" className="font-medium text-foreground hover:underline">
          Back to log in
        </Link>
      </p>
    </div>
  )
}
