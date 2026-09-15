import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type { InterviewCompetencyEvidenceRow, InterviewFeedbackQuestRow, InterviewPracticeLog, InterviewSpacedReviewRow } from '@/lib/supabase/types'
import { buildCompetencyMastery, buildConsistency, buildInterviewRewards, buildReviewQueue, calculateConsistencyStreak, competencyLabel, inferredReviewStage, INTERVIEW_PROGRESSION_CONFIG, legacyProgression, reviewStationForCompetency, selectDailyStation, suggestedQuest, type FeedbackQuest, type InterviewCompetency, type InterviewProgressionData } from './progression'
import { practiceDay, shiftDay, type PracticeLog } from './practice-progress'
import { INTERVIEW_STATION_METADATA } from './station-metadata'

const competencySet = new Set<string>(['communication','empathy','ethical_reasoning','teamwork','motivation_for_medicine','reflection','healthcare_awareness','adaptability'])
const isCompetency = (value: string): value is InterviewCompetency => competencySet.has(value)

function questFromRow(row: InterviewFeedbackQuestRow): FeedbackQuest {
  return {
    id: row.id,
    behaviour: row.behaviour,
    status: row.status === 'replaced' ? 'assigned' : row.status,
    competencies: row.competencies.filter(isCompetency),
    evidence: row.evidence_excerpt,
    source: row.source,
  }
}

async function loadLongHistory(userId: string, fallback: PracticeLog[], today: string) {
  const db = createAdminClient(), result: InterviewPracticeLog[] = []
  const from = shiftDay(today, -365)
  for (let page = 0; page < 10; page++) {
    const { data, error } = await db.from('interview_practice_logs').select('id,user_id,station_id,format,source,attempt_id,started_at,completed_at,duration_seconds,self_rating').eq('user_id', userId).gte('completed_at', from + 'T00:00:00Z').order('completed_at', { ascending: false }).range(page * 1000, page * 1000 + 999)
    if (error) return fallback
    result.push(...(data ?? []))
    if ((data?.length ?? 0) < 1000) break
  }
  return result
}

async function ensureQuest(userId: string, mastery: ReturnType<typeof buildCompetencyMastery>, rows: InterviewFeedbackQuestRow[]) {
  const active = rows.filter(row => row.status !== 'replaced' && row.status !== 'consolidated').sort((a, b) => Number(b.tutor_override) - Number(a.tutor_override) || b.created_at.localeCompare(a.created_at))
  if (active[0]) return active[0]
  const weakest = [...mastery].sort((a, b) => a.score - b.score || a.attempts - b.attempts)[0]
  const suggested = suggestedQuest(weakest.competency)
  const db = createAdminClient()
  const { data, error } = await db.from('interview_feedback_quests').insert({ user_id: userId, behaviour: suggested.behaviour, competencies: suggested.competencies, source: 'automated' }).select('*').single()
  if (error || !data) throw new Error('progression_quest_unavailable')
  return data
}

async function ensureDaily(userId: string, today: string, logs: PracticeLog[], mastery: ReturnType<typeof buildCompetencyMastery>, quest: InterviewFeedbackQuestRow, allowedStationIds?: readonly string[]) {
  const db = createAdminClient()
  const { data: existing, error: readError } = await db.from('interview_daily_stations').select('*').eq('user_id', userId).eq('local_day', today).maybeSingle()
  if (readError) throw new Error('progression_daily_unavailable')
  if (existing) return existing
  const selected = selectDailyStation(userId, today, mastery, logs, undefined, allowedStationIds)
  const { data, error } = await db.from('interview_daily_stations').insert({ user_id: userId, local_day: today, station_id: selected.stationId, format: selected.format, competencies: selected.competencies, reason: selected.reason, quest_id: quest.id }).select('*').single()
  if (!error && data) return data
  const { data: raced } = await db.from('interview_daily_stations').select('*').eq('user_id', userId).eq('local_day', today).maybeSingle()
  if (!raced) throw new Error('progression_daily_unavailable')
  return raced
}

async function ensureReviews(userId: string, today: string, mastery: ReturnType<typeof buildCompetencyMastery>, rows: InterviewSpacedReviewRow[], allowedStationIds?: readonly string[]) {
  const db = createAdminClient()
  await db.from('interview_spaced_reviews').update({ status: 'due' }).eq('user_id', userId).eq('status', 'scheduled').lte('due_day', today)
  const active = new Set(rows.filter(row => row.status === 'due' || row.status === 'scheduled').map(row => row.competency))
  for (const item of mastery.filter(entry => entry.attempts > 0 && entry.lastPractised)) {
    if (active.has(item.competency)) continue
    const latestCompleted = rows.filter(row => row.competency === item.competency && row.status === 'completed' && row.completed_at).sort((a, b) => b.completed_at!.localeCompare(a.completed_at!))[0]
    const sourceStation = latestCompleted?.review_station_id ?? item.stationIds.at(-1)
    if (!sourceStation) continue
    const stage = latestCompleted?.interval_stage ?? inferredReviewStage(item)
    const baseDay = latestCompleted?.completed_at ? practiceDay(new Date(latestCompleted.completed_at)) : item.lastPractised!
    const dueDay = shiftDay(baseDay, INTERVIEW_PROGRESSION_CONFIG.reviewIntervalsDays[Math.max(0, Math.min(4, stage))])
    const reviewStation = reviewStationForCompetency(item.competency, sourceStation, allowedStationIds)
    if (!reviewStation || reviewStation.id === sourceStation) continue
    await db.from('interview_spaced_reviews').insert({ user_id: userId, competency: item.competency, source_station_id: sourceStation, review_station_id: reviewStation.id, reason: item.reviewReason, interval_stage: stage, due_day: dueDay, status: dueDay <= today ? 'due' : 'scheduled' })
    active.add(item.competency)
  }
  const { data } = await db.from('interview_spaced_reviews').select('*').eq('user_id', userId).in('status', ['scheduled','due']).order('due_day').limit(12)
  return data ?? []
}

function attemptSummary(id: string | null, logs: PracticeLog[]) {
  if (!id) return undefined
  const log = logs.find(item => item.id === id)
  return log ? { id: log.id, duration: log.duration_seconds, rating: log.self_rating } : undefined
}

export async function loadInterviewProgression(userId: string, fallbackLogs: PracticeLog[], today = practiceDay(new Date()), allowedStationIds?: readonly string[]): Promise<InterviewProgressionData> {
  const logs = await loadLongHistory(userId, fallbackLogs, today)
  const fallback = legacyProgression(userId, logs, today, allowedStationIds)
  try {
    const db = createAdminClient()
    const [{ data: questRows, error: questError }, { data: profile, error: profileError }, { data: reviewRows, error: reviewError }, { data: evidenceRows, error: evidenceError }, { data: badgeRows, error: badgeError }] = await Promise.all([
      db.from('interview_feedback_quests').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
      db.from('interview_progression_profiles').select('*').eq('user_id', userId).maybeSingle(),
      db.from('interview_spaced_reviews').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
      db.from('interview_competency_evidence').select('*').eq('user_id', userId).order('observed_at', { ascending: false }).limit(2000),
      db.from('interview_badges').select('badge_key,earned_at').eq('user_id', userId).order('earned_at', { ascending: false }),
    ])
    if (questError || profileError || reviewError || evidenceError || badgeError) throw new Error('progression_unavailable')
    const masteryEvidence = ((evidenceRows ?? []) as InterviewCompetencyEvidenceRow[]).filter(row => isCompetency(row.competency)).map(row => ({ competency: row.competency as InterviewCompetency, practiceLogId: row.practice_log_id, source: row.source, score: Number(row.evidence_score), observedAt: row.observed_at, behaviour: row.behaviour, evidenceExcerpt: row.evidence_excerpt }))
    const mastery = buildCompetencyMastery(logs, today, masteryEvidence).map(item => {
      const relatedQuests = (questRows ?? []).filter(row => row.competencies.includes(item.competency))
      return { ...item, repeatedFeedbackPatterns: [...new Set(relatedQuests.map(row => row.behaviour))].slice(0, 2), completedQuests: relatedQuests.filter(row => row.status === 'consolidated').length }
    })
    const quest = await ensureQuest(userId, mastery, questRows ?? [])
    const dailyRow = await ensureDaily(userId, today, logs, mastery, quest, allowedStationIds)
    const activeReviewRows = await ensureReviews(userId, today, mastery, reviewRows ?? [], allowedStationIds)
    const graceMonth = today.slice(0, 7) + '-01'
    const mayUseGrace = profile?.grace_month !== graceMonth || !profile.grace_used
    const streak = calculateConsistencyStreak(logs, today, mayUseGrace)
    const profileUpdate = {
      // These legacy column names now store daily streak values.
      current_consistency_weeks: streak.days,
      best_consistency_weeks: Math.max(streak.days, profile?.best_consistency_weeks ?? 0),
      grace_month: graceMonth,
      grace_used: streak.usedGrace || (profile?.grace_month === graceMonth && Boolean(profile.grace_used)),
      updated_at: new Date().toISOString(),
    }
    if (!profile) await db.from('interview_progression_profiles').insert({ user_id: userId, ...profileUpdate })
    else await db.from('interview_progression_profiles').update(profileUpdate).eq('user_id', userId)
    const storedDaily = {
      id: dailyRow.id,
      stationId: dailyRow.station_id,
      phase: dailyRow.status,
      xp: dailyRow.xp_awarded,
      firstAttempt: attemptSummary(dailyRow.first_attempt_log_id, logs),
      retry: attemptSummary(dailyRow.retry_log_id, logs),
    } as const
    const daily = selectDailyStation(userId, today, mastery, logs, storedDaily, allowedStationIds)
    const activeQuests = (questRows ?? []).filter(row => row.status !== 'replaced' && row.status !== 'consolidated').slice(0, 3).map(questFromRow)
    if (!activeQuests.some(item => item.id === quest.id)) activeQuests.unshift(questFromRow(quest))
    const reviews = activeReviewRows.filter(row => row.due_day <= shiftDay(today, 14)).slice(0, 3).map(row => ({
      id: row.id,
      competency: row.competency as InterviewCompetency,
      label: competencyLabel(row.competency as InterviewCompetency),
      reason: row.reason,
      dueDay: row.due_day,
      href: `/interviews/practice/session?format=${INTERVIEW_STATION_METADATA.find(station => station.id === row.review_station_id)?.format ?? 'mmi'}&station=${encodeURIComponent(row.review_station_id)}&review=${row.competency}`,
    }))
    return {
      available: true,
      durable: true,
      totalXp: profile?.total_xp ?? 0,
      daily,
      quest: questFromRow(quest),
      activeQuests: activeQuests.slice(0, 3),
      consistency: buildConsistency(logs, today, streak.days, profileUpdate.best_consistency_weeks, !profileUpdate.grace_used),
      mastery,
      reviews: reviews.length ? reviews : buildReviewQueue(mastery, today, allowedStationIds),
      rewards: buildInterviewRewards(profile?.total_xp ?? 0, profile?.focus_tokens ?? 0, badgeRows ?? []),
    }
  } catch {
    return { ...fallback, available: false }
  }
}
