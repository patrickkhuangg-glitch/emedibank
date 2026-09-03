import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth/dal'
import { getPracticeSessionReview } from '@/lib/practice/sessions'
import { PastSessionReview } from './past-session-review'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Review practice session' }

export default async function PracticeReviewPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const user = await requireUser()
  const { sessionId } = await params
  const review = await getPracticeSessionReview(user.id, sessionId)
  if (!review) notFound()
  return <PastSessionReview review={review} />
}
