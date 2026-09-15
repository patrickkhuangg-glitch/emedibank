import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getProfile, getUser } from '@/lib/auth/dal'
import { safeInternalPath } from '@/lib/auth/roles'
import { destinationAfterSignIn } from '@/lib/auth/profile-completion'
import { GoogleButton } from '@/components/ui/google-button'
import { Alert } from '@/components/ui/alert'
import { LoginForm } from './login-form'

export const metadata: Metadata = { title: 'Log in' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; error?: string }>
}) {
  const { redirectTo, error } = await searchParams
  const safeRedirect = safeInternalPath(redirectTo) ?? undefined
  if (await getUser()) redirect(destinationAfterSignIn(await getProfile(), safeRedirect))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Welcome back</h1>
        <p className="mt-1 text-sm text-muted">Log in to your account.</p>
      </div>
      {error ? <Alert>{error === 'session_replaced' ? 'This account was signed in on another device. Sign in again to continue here.' : 'Sign-in failed. Please try again.'}</Alert> : null}
      <GoogleButton redirectTo={safeRedirect} />
      <Divider />
      <LoginForm redirectTo={safeRedirect} />
      <p className="text-center text-sm text-muted">
        No account?{' '}
        <Link href="/signup" className="font-medium text-foreground hover:underline">
          Sign up free
        </Link>
      </p>
    </div>
  )
}

function Divider() {
  return (
    <div className="flex items-center gap-3 text-xs text-muted">
      <span className="h-px flex-1 bg-border" />
      or
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}
