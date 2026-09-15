import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getProfile, getUser } from '@/lib/auth/dal'
import { destinationAfterSignIn, hasRequiredPhone } from '@/lib/auth/profile-completion'
import { signOutAction } from '@/lib/auth/actions'
import { CompleteProfileForm } from './profile-form'

export const metadata: Metadata = { title: 'Complete your profile' }

export default async function CompleteProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const user = await getUser()
  if (!user) redirect('/login')
  const profile = await getProfile()
  const { next } = await searchParams
  if (hasRequiredPhone(profile)) redirect(destinationAfterSignIn(profile, next))

  const suggestedName = profile?.full_name
    ?? String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? '')

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-brand">One last step</p>
        <h1 className="mt-1 text-xl font-semibold">Complete your profile</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Add your mobile number before entering Studocyte. This helps us keep student access tied to the correct account.
        </p>
      </div>
      <CompleteProfileForm fullName={suggestedName} next={next} />
      <p className="text-center text-xs leading-5 text-muted">
        Signed in as {user.email}
      </p>
      <form action={signOutAction} className="text-center">
        <button type="submit" className="text-sm font-medium text-muted hover:text-foreground hover:underline">
          Use a different account
        </button>
      </form>
    </div>
  )
}
