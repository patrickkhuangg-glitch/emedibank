import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getProfile, getUser } from '@/lib/auth/dal'
import { homeForRole } from '@/lib/auth/roles'
import { SignupForm } from './signup-form'

export const metadata: Metadata = { title: 'Sign up' }

export default async function SignupPage() {
  if (await getUser()) redirect(homeForRole((await getProfile())?.role))
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Create your account</h1>
        <p className="mt-1 text-sm text-muted">
          Your 7-day free trial starts when you create your account — full access to every exam and Interviews, no card required.
        </p>
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
