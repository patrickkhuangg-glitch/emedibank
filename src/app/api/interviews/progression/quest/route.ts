import { getUser } from '@/lib/auth/dal'
import { createAdminClient } from '@/lib/supabase/admin'
import { apiError, InterviewApiError, readSmallJson } from '@/lib/interviews/api'
import { INTERVIEW_COMPETENCIES, INTERVIEW_PROGRESSION_CONFIG, practiceDayForProgression, suggestedQuest, type InterviewCompetency } from '@/lib/interviews/progression'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
  try {
    const user = await getUser()
    if (!user) throw new InterviewApiError('Sign in required.', 401)
    if (request.headers.get('origin') !== new URL(request.url).origin) throw new InterviewApiError('Request origin is not allowed.', 403)
    const body = await readSmallJson(request), competency = String(body.competency ?? '') as InterviewCompetency, questId = typeof body.questId === 'string' ? body.questId : null
    if ((!questId || !uuid.test(questId)) && !INTERVIEW_COMPETENCIES.includes(competency)) throw new InterviewApiError('Choose an available feedback focus.')
    const db = createAdminClient(), today = practiceDayForProgression(new Date())
    const { data: daily, error } = await db.from('interview_daily_stations').select('id,quest_id').eq('user_id', user.id).eq('local_day', today).maybeSingle()
    if (error || !daily) throw new InterviewApiError('Today’s progression is not ready yet. Reload the dashboard and try again.', 409)
    const { data: current } = daily.quest_id ? await db.from('interview_feedback_quests').select('*').eq('id', daily.quest_id).eq('user_id', user.id).maybeSingle() : { data: null }
    const { data: requested } = questId && uuid.test(questId) ? await db.from('interview_feedback_quests').select('*').eq('id', questId).eq('user_id', user.id).in('status', ['assigned','practised','demonstrated_once']).maybeSingle() : { data: null }
    if (questId && !requested) throw new InterviewApiError('That Feedback Quest is no longer active.', 409)
    if (!requested && current?.tutor_override && !current.competencies.includes(competency)) throw new InterviewApiError('Your tutor has set the current priority. Complete or discuss it before replacing it.', 409)
    if (requested) {
      if (current?.tutor_override && current.id !== requested.id) throw new InterviewApiError('Your tutor has set the current priority. Complete or discuss it before replacing it.', 409)
      await db.from('interview_feedback_quests').update({ accepted_at: new Date().toISOString() }).eq('id', requested.id).eq('user_id', user.id)
      await db.from('interview_daily_stations').update({ quest_id: requested.id }).eq('id', daily.id).eq('user_id', user.id)
      return Response.json({ quest: { id: requested.id, behaviour: requested.behaviour, status: requested.status, competencies: requested.competencies, evidence: requested.evidence_excerpt, source: requested.source } }, { headers: { 'Cache-Control': 'private, no-store' } })
    }
    if (current?.competencies.includes(competency)) {
      await db.from('interview_feedback_quests').update({ accepted_at: new Date().toISOString() }).eq('id', current.id).eq('user_id', user.id)
      return Response.json({ quest: { id: current.id, behaviour: current.behaviour, status: current.status, competencies: current.competencies, evidence: current.evidence_excerpt, source: current.source } })
    }
    const next = suggestedQuest(competency)
    if (current && current.source === 'automated') await db.from('interview_feedback_quests').update({ status: 'replaced' }).eq('id', current.id).eq('user_id', user.id)
    const { data: created, error: createError } = await db.from('interview_feedback_quests').insert({ user_id: user.id, behaviour: next.behaviour, competencies: next.competencies, source: 'automated', accepted_at: new Date().toISOString() }).select('*').single()
    if (createError || !created) throw new InterviewApiError('Your feedback focus could not be changed. Please try again.', 503)
    await db.from('interview_daily_stations').update({ quest_id: created.id }).eq('id', daily.id).eq('user_id', user.id)
    const { data: active } = await db.from('interview_feedback_quests').select('id,tutor_override,created_at').eq('user_id', user.id).in('status', ['assigned','practised','demonstrated_once']).order('tutor_override', { ascending: false }).order('created_at', { ascending: false })
    const overflow = (active ?? []).slice(INTERVIEW_PROGRESSION_CONFIG.maximumActiveQuests).filter(item => !item.tutor_override).map(item => item.id)
    if (overflow.length) await db.from('interview_feedback_quests').update({ status: 'replaced' }).eq('user_id', user.id).in('id', overflow)
    return Response.json({ quest: { id: created.id, behaviour: created.behaviour, status: created.status, competencies: created.competencies, evidence: created.evidence_excerpt, source: created.source } }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return apiError(error) }
}
