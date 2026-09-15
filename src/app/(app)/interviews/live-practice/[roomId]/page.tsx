import type { Metadata } from 'next'
import { requireUser } from '@/lib/auth/dal'
import { liveRoomSnapshot } from '@/lib/interviews/live-practice-data'
import { LivePracticeRoom } from '@/components/interviews/live-practice-room'

export const metadata: Metadata = { title: 'Live Practice room' }

export default async function LivePracticeRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const user = await requireUser('/interviews/live-practice'), { roomId } = await params
  return <LivePracticeRoom initial={await liveRoomSnapshot(roomId, user)} />
}
