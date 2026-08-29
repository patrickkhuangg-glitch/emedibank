import type { Metadata } from 'next'
import { Container } from '@/components/container'
import { requireUser, getProfile } from '@/lib/auth/dal'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  await requireUser('/dashboard')
  const profile = await getProfile()
  const name = profile?.full_name?.split(' ')[0] ?? 'there'

  return (
    <Container className="py-16">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight">Hi {name} 👋</h1>
        <p className="mt-2 text-muted">
          You&rsquo;re on the free tier. Exam content lands in later phases — for now
          this is your home base.
        </p>
        <div className="mt-8 rounded-lg border border-border bg-surface p-6 text-sm text-muted">
          Your exam areas and unlock status will appear here.
        </div>
      </div>
    </Container>
  )
}
