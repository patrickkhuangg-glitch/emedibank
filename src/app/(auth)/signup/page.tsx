import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth/dal'
import { GoogleButton } from '@/components/ui/google-button'
import { SignupForm } from './signup-form'

export const metadata: Metadata = { title: 'Sign up' }

export default async function SignupPage() {
  if (await getUser()) redirect('/dashboard')
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Create your account</h1>
        <p className="mt-1 text-sm text-muted">
          Free to start — you get the free-tier subtests right away.
        </p>
      </div>
      <GoogleButton />
      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>
      <SignupForm />
      <p className="text-center text-sm text-muted">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-foreground hover:underline">
          Log in
        </Link>
      </p>
    </div>
  )
}
