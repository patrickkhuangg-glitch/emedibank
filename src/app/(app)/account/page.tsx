import type { Metadata } from 'next'
import Link from 'next/link'
import { PageContainer as Container } from '@/components/container'
import { ButtonLink } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { requireUser, getProfile } from '@/lib/auth/dal'
import { createClient } from '@/lib/supabase/server'
import { BillingButton } from './billing-button'
import { InterfaceModeToggle } from './interface-mode-toggle'
import { ProfileForm } from './profile-form'
import { interviewOfferById } from '@/lib/interviews/marketing'
import { subscriptionPeriodLabel } from '@/lib/stripe/subscription-label'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Account · Studocyte' }

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; complete?: string; purchase?: string }>
}) {
  const user = await requireUser('/account')
  const profile = await getProfile()
  const { checkout, complete, purchase } = await searchParams
  const supabase = await createClient()

  const [{ data: exams }, { data: entitlements }, { data: subscriptions }, { data: purchases }] = await Promise.all([
    supabase.from('exams').select('*').eq('active', true).order('created_at'),
    supabase.from('entitlements').select('*'),
    supabase.from('subscriptions').select('*').order('created_at', { ascending: false }),
    supabase.from('interview_purchase_grants').select('*').order('created_at', { ascending: false }),
  ])

  const entitledExamIds = new Set((entitlements ?? []).map((e) => e.exam_id))
  const studentView = profile?.role === 'student'
  const hasBilling = studentView && Boolean(profile?.stripe_customer_id)

  return (
    <Container>
      <div className="w-full space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="page-title">Account</h1>
            <p className="mt-1 text-muted">{profile?.full_name ?? user.email}</p>
            {!studentView ? <span className="mt-3 inline-flex rounded-full bg-brand-muted px-3 py-1 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-brand">{profile?.role} workspace</span> : null}
          </div>
          {hasBilling ? <BillingButton /> : null}
        </div>

        {checkout === 'success' ? (
          <Alert kind="success">{purchase ? 'Purchase complete — your access and review credits are updated below.' : 'Subscription started — your access is unlocked below.'}</Alert>
        ) : null}

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Your details</h2>
          {studentView && complete === 'trial' ? <p className="mt-2 text-sm leading-6 text-muted">Add your full name and mobile number before starting a free trial.</p> : null}
          <ProfileForm fullName={profile?.full_name ?? ''} phoneNumber={profile?.phone_number ?? ''} />
        </section>

        {studentView ? <>
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Your access</h2>
          <div className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {(exams ?? []).map((exam) => {
              const unlocked = entitledExamIds.has(exam.id)
              return (
                <div key={exam.id} className="flex items-center justify-between px-4 py-3">
                  <span className="font-medium">{exam.name}</span>
                  {unlocked ? (
                    <span className="rounded-full bg-success-muted px-3 py-1 text-xs font-medium text-success">
                      Full access
                    </span>
                  ) : (
                    <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-muted">
                      Free tier
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Essay marking credits</h2>
          <div className="mt-3 flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface px-4 py-3">
            <span className="text-sm text-muted">Used for GAMSAT Section II tutor marking (2 credits per essay).</span>
            <span className="shrink-0 rounded-full bg-brand-muted px-3 py-1 text-sm font-semibold text-brand">{profile?.essay_credits ?? 0} credits</span>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Interview marking credits</h2>
          <div className="mt-3 flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface px-4 py-3">
            <span className="text-sm text-muted">2 credits per MMI station or 12 per full MMI or panel mock.</span>
            <span className="shrink-0 rounded-full bg-brand-muted px-3 py-1 text-sm font-semibold text-brand">{profile?.mmi_credits ?? 0} credits</span>
          </div>
        </section>
        </> : null}

        {studentView ? ((subscriptions ?? []).length > 0 || (purchases ?? []).length > 0 ? (
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Plans and purchases</h2>
            <div className="mt-3 space-y-2">
              {(purchases ?? []).map((item) => {
                const offer = interviewOfferById(item.offer_id)
                return <div key={item.id} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface px-4 py-3 text-sm">
                  <span>{offer?.name ?? `${item.credits} Interview review credits`}</span>
                  <span className="text-right text-muted">{item.access_expires_at ? `Access until ${new Date(item.access_expires_at).toLocaleDateString()}` : `${item.credits} credits added`}</span>
                </div>
              })}
              {(subscriptions ?? []).map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3 text-sm"
                >
                  <span className="capitalize">{sub.status}</span>
                  <span className="text-muted">
                    {subscriptionPeriodLabel(sub.status, sub.current_period_end)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-border bg-surface p-6 text-center">
            <p className="text-muted">You&rsquo;re on the free tier.</p>
            <ButtonLink href="/pricing" className="mt-4">See plans</ButtonLink>
          </section>
        )) : (
          <section className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Staff access</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Your navigation and permissions are set by your {profile?.role} role. Student subscriptions, exam access and marking credits are kept out of this workspace.</p>
          </section>
        )}

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Interface style</h2>
          <p className="mt-1 text-sm text-muted">How Studocyte looks while you&rsquo;re signed in. Colours and layout stay the same either way.</p>
          <div className="mt-3">
            <InterfaceModeToggle current={profile?.interface_mode ?? 'playful'} />
          </div>
        </section>

        <p className="text-sm text-muted">
          <Link href="/update-password" className="hover:text-foreground">Change password</Link>
        </p>
      </div>
    </Container>
  )
}
