import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getProfile, getUser } from '@/lib/auth/dal'
import { homeForRole, safeInternalPath } from '@/lib/auth/roles'
import { GoogleButton } from '@/components/ui/google-button'
import { Alert } from '@/components/ui/alert'
import { LoginForm } from './login-form'

export const metadata: Metadata = { title: 'Log in' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; error?: string }>
}) {
  if (await getUser()) redirect(homeForRole((await getProfile())?.role))
  const { redirectTo, error } = await searchParams
  const safeRedirect = safeInternalPath(redirectTo) ?? undefined

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Welcome back</h1>
        <p className="mt-1 text-sm text-muted">Log in to your account.</p>
      </div>
      {error ? <Alert>Sign-in failed. Please try again.</Alert> : null}
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
