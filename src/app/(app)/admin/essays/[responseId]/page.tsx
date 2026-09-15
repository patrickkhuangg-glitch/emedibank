import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PageContainer as Container } from '@/components/container'
import { requireAdmin } from '@/lib/auth/dal'
import { getMarkingDetail } from '@/lib/essays/data'
import { MarkingReview } from './marking-review'

export const dynamic = 'force-dynamic'

export default async function MarkEssayPage({ params }: { params: Promise<{ responseId: string }> }) {
  await requireAdmin()
  const { responseId } = await params
  const detail = await getMarkingDetail(responseId)
  if (!detail) notFound()

  return (
    <Container>
      <div className="w-full">
        <Link href="/admin/essays" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
          <span aria-hidden>←</span> Marking queue
        </Link>
        <MarkingReview detail={detail} />
      </div>
    </Container>
  )
}
