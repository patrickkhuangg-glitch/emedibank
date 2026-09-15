import { getUser } from '@/lib/auth/dal'
import { createClient } from '@/lib/supabase/server'
import { apiError, InterviewApiError, readSmallJson } from '@/lib/interviews/api'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
  try {
    const user = await getUser()
    if (!user) throw new InterviewApiError('Sign in required.', 401)
    if (request.headers.get('origin') !== new URL(request.url).origin) throw new InterviewApiError('Request origin is not allowed.', 403)
    const body = await readSmallJson(request)
    const attemptId = String(body.attemptId ?? ''), action = String(body.action ?? '')
    if (!uuid.test(attemptId) || !['review','demonstrate'].includes(action)) throw new InterviewApiError('Choose a valid progression action.')
    const evidence = typeof body.evidence === 'string' ? body.evidence.trim() : null
    if (action === 'demonstrate' && (!evidence || evidence.length < 12 || evidence.length > 500)) throw new InterviewApiError('Add a short excerpt or observation showing the behaviour.')
    const db = await createClient()
    const { data, error } = await db.rpc('record_interview_progression_action', { p_attempt_id: attemptId, p_action: action, p_evidence: evidence })
    if (error) throw new InterviewApiError('Progression is being prepared. Your recording and transcript are still safe.', 503)
    const result = data && typeof data === 'object' ? data as Record<string, unknown> : {}
    const status = typeof result.status === 'string' ? result.status : 'unavailable'
    if (status === 'transcript_not_ready') throw new InterviewApiError('Your transcript is still processing. Try again once it appears.', 409)
    if (status === 'evidence_required') throw new InterviewApiError('Add a short excerpt or observation showing the behaviour.')
    if (!['reviewed','complete'].includes(status)) throw new InterviewApiError('This step is not available for this attempt yet.', 409)
    return Response.json({ status, xp: Number(result.xp ?? 0), focusTokens: Number(result.focus_tokens ?? 0), questStatus: result.quest_status ?? null }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return apiError(error) }
}
