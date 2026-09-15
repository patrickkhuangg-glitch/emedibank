import { getUser } from '@/lib/auth/dal'
import { apiError, InterviewApiError } from '@/lib/interviews/api'
import { liveIceServers } from '@/lib/interviews/live-ice'
import { ownedLiveRoom } from '@/lib/interviews/live-practice-data'

export async function GET(_request: Request, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const user = await getUser()
    if (!user) throw new InterviewApiError('Sign in required.', 401)
    const { roomId } = await params
    await ownedLiveRoom(roomId, user)
    return Response.json(
      { iceServers: liveIceServers() },
      { headers: { 'Cache-Control': 'private, no-store', Pragma: 'no-cache' } },
    )
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('invalid_interview_turn_')) {
      return apiError(new InterviewApiError('The live connection service is not configured correctly.', 503))
    }
    return apiError(error)
  }
}
