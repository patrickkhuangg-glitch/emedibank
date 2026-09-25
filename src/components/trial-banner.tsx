import Link from 'next/link'
import { Container } from './container'
import { getProfile, getUser } from '@/lib/auth/dal'
import { getTrialEndsAt, hasAnyPaidAccess, trialDaysLeft } from '@/lib/access'

/** Free-trial status for students without paid access: days left while the
 *  trial runs (with a buy-now link), or a paywall notice once it has ended. */
export async function TrialBanner() {
  const user = await getUser()
  if (!user) return null
  const profile = await getProfile()
  if (profile?.role !== 'student') return null

  const [endsAt, paid] = await Promise.all([getTrialEndsAt(user.id), hasAnyPaidAccess(user.id)])
  if (paid || !endsAt) return null

  const daysLeft = trialDaysLeft(endsAt)
  const active = daysLeft > 0

  return (
    <div className={active ? 'border-b border-brand/15 bg-brand-muted' : 'bg-ink text-ink-foreground'}>
      <Container className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2.5 text-sm">
        <p>
          {active ? (
            <><span className="font-semibold">Free trial · {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left.</span> Full access to every exam and Interviews until {endsAt.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}.</>
          ) : (
            <><span className="font-semibold">Your free trial has ended.</span> Subscribe to unlock practice, mocks, essays and Interviews again.</>
          )}
        </p>
        <Link href="/pricing" className="eb-press shrink-0 rounded-full bg-brand px-3.5 py-1.5 text-xs font-semibold text-brand-foreground">
          {active ? 'Subscribe now' : 'See plans'}
        </Link>
      </Container>
    </div>
  )
}
