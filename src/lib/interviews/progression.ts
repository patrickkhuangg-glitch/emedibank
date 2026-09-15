import { INTERVIEW_STATION_METADATA } from './station-metadata'
import { completedLogs, practiceDay, shiftDay, weekStart, type PracticeLog } from './practice-progress'

export const INTERVIEW_COMPETENCIES = [
  'communication',
  'empathy',
  'ethical_reasoning',
  'teamwork',
  'motivation_for_medicine',
  'reflection',
  'healthcare_awareness',
  'adaptability',
] as const

export type InterviewCompetency = typeof INTERVIEW_COMPETENCIES[number]
export type MasteryState = 'Starting' | 'Developing' | 'Consistent' | 'Strong' | 'Interview-ready'
export type MasteryTrend = 'Building' | 'Steady' | 'Needs attention'
export type QuestStatus = 'assigned' | 'practised' | 'demonstrated_once' | 'consolidated'

export const INTERVIEW_PRACTICE_LEVELS = [
  { number: 1, name: 'Getting Started', xp: 0 },
  { number: 2, name: 'Finding Your Voice', xp: 100 },
  { number: 3, name: 'Building Structure', xp: 250 },
  { number: 4, name: 'Thoughtful Responder', xp: 500 },
  { number: 5, name: 'Reflective Communicator', xp: 850 },
  { number: 6, name: 'Consistent Candidate', xp: 1300 },
  { number: 7, name: 'Circuit Ready', xp: 1900 },
  { number: 8, name: 'Interview Prepared', xp: 2700 },
] as const

export const INTERVIEW_BADGES = [
  { key: 'balanced_thinker', label: 'Balanced Thinker', criterion: 'Consolidate an ethical reasoning quest that weighs competing considerations.' },
  { key: 'specific_storyteller', label: 'Specific Storyteller', criterion: 'Consolidate a reflection or motivation quest using a specific experience.' },
  { key: 'feedback_in_action', label: 'Feedback in Action', criterion: 'Consolidate one Feedback Quest across more than one response.' },
  { key: 'retention_proven', label: 'Retention Proven', criterion: 'Successfully complete a due spaced review.' },
  { key: 'reflective_practitioner', label: 'Reflective Practitioner', criterion: 'Build reflection evidence across five relevant practices.' },
  { key: 'circuit_composure', label: 'Circuit Composure', criterion: 'Complete a full timed MMI or panel circuit.' },
  { key: 'adaptable_communicator', label: 'Adaptable Communicator', criterion: 'Build repeated evidence in communication and adaptability.' },
] as const

export type InterviewBadgeKey = typeof INTERVIEW_BADGES[number]['key']

export const INTERVIEW_PROGRESSION_CONFIG = {
  dailyXp: 70,
  xp: { firstAttempt: 20, review: 10, retry: 25, demonstrated: 15, spacedReview: 20, retentionBonus: 10, circuit: 75, consistencyWeek: 50 },
  totalDailyXpCap: 250,
  minimumMeaningfulSeconds: { mmi: 45, panel: 30 },
  masteryHalfLifeDays: 45,
  reviewIntervalsDays: [1, 3, 7, 14, 30] as const,
  weeklyActiveDayGoal: 5,
  maximumVisibleReviews: 3,
  maximumActiveQuests: 3,
} as const

export const practiceDayForProgression = practiceDay

export type CompetencyMastery = {
  competency: InterviewCompetency
  label: string
  state: MasteryState
  score: number
  trend: MasteryTrend
  retention: number
  attempts: number
  strongestBehaviour: string
  nextAction: string
  lastPractised: string | null
  reviewDue: boolean
  reviewReason: string
  history: Array<{ day: string; score: number }>
  stationIds: string[]
  stationTitles?: string[]
  repeatedFeedbackPatterns?: string[]
  completedQuests?: number
}

export type CompetencyEvidence = {
  competency: InterviewCompetency
  practiceLogId: string | null
  source: 'self_rating' | 'automated' | 'tutor' | 'legacy'
  score: number
  observedAt: string
  behaviour?: string | null
  evidenceExcerpt?: string | null
}

export type FeedbackQuest = {
  id: string
  behaviour: string
  status: QuestStatus
  competencies: InterviewCompetency[]
  evidence: string | null
  source: 'automated' | 'tutor' | 'legacy'
}

export type DailyStation = {
  id: string
  day: string
  stationId: string
  title: string
  format: 'mmi' | 'panel'
  preparation: string
  response: string
  competencies: InterviewCompetency[]
  href: string
  reason: string
  phase: 'answer' | 'review' | 'retry' | 'complete'
  xp: number
  firstAttempt?: { id: string; duration: number; rating: number | null }
  retry?: { id: string; duration: number; rating: number | null }
  comparison?: string
}

export type ConsistencyProgress = {
  activeDays: number
  goal: number
  daysRemaining: number
  todayActive: boolean
  expiresAt: string
  timeRemaining: string
  currentDays: number
  personalBestDays: number
  graceAvailable: boolean
  message: string
}

export type ConsistencyStreak = { days: number; usedGrace: boolean }

export type ReviewDue = {
  id: string
  competency: InterviewCompetency
  label: string
  reason: string
  dueDay: string
  href: string
}

export type PracticeLevel = {
  number: number
  name: string
  totalXp: number
  progress: number
  toNext: number
  nextName: string | null
}

export type InterviewRewardBadge = {
  key: InterviewBadgeKey
  label: string
  criterion: string
  earnedAt: string | null
}

export type InterviewRewards = {
  level: PracticeLevel
  focusTokens: number
  badges: InterviewRewardBadge[]
}

export type InterviewProgressionData = {
  available: boolean
  durable: boolean
  totalXp: number
  daily: DailyStation
  quest: FeedbackQuest | null
  activeQuests: FeedbackQuest[]
  consistency: ConsistencyProgress
  mastery: CompetencyMastery[]
  reviews: ReviewDue[]
  rewards: InterviewRewards
}

export function practiceLevelFromXp(value: number): PracticeLevel {
  const totalXp = Math.max(0, Math.floor(value))
  const current = [...INTERVIEW_PRACTICE_LEVELS].reverse().find(level => totalXp >= level.xp) ?? INTERVIEW_PRACTICE_LEVELS[0]
  const next = INTERVIEW_PRACTICE_LEVELS.find(level => level.number === current.number + 1)
  const span = next ? next.xp - current.xp : 1
  return { number: current.number, name: current.name, totalXp, progress: next ? Math.max(0, Math.min(1, (totalXp - current.xp) / span)) : 1, toNext: next ? Math.max(0, next.xp - totalXp) : 0, nextName: next?.name ?? null }
}

export function buildInterviewRewards(totalXp: number, focusTokens = 0, earned: Array<{ badge_key: string; earned_at: string }> = []): InterviewRewards {
  const earnedAt = new Map(earned.map(item => [item.badge_key, item.earned_at]))
  return {
    level: practiceLevelFromXp(totalXp),
    focusTokens: Math.max(0, Math.floor(focusTokens)),
    badges: INTERVIEW_BADGES.map(badge => ({ ...badge, earnedAt: earnedAt.get(badge.key) ?? null })),
  }
}

const COPY: Record<InterviewCompetency, { label: string; strongest: string; action: string; review: string }> = {
  communication: { label: 'Communication', strongest: 'Explains a decision clearly and in a logical order.', action: 'State your decision first, then give one clear reason.', review: 'Practise making your reasoning easy to follow.' },
  empathy: { label: 'Empathy', strongest: 'Acknowledges another person’s perspective before proposing action.', action: 'Name the person’s concern explicitly before moving to solutions.', review: 'Revisit perspective-taking in a new scenario.' },
  ethical_reasoning: { label: 'Ethical reasoning', strongest: 'Balances competing duties before reaching a proportionate judgement.', action: 'Present both sides before reaching your ethical judgement.', review: 'Practise balancing competing ethical considerations.' },
  teamwork: { label: 'Teamwork', strongest: 'Escalates appropriately while preserving the working relationship.', action: 'Use one specific example of listening, contribution and shared action.', review: 'Revisit after difficulty using a specific teamwork example.' },
  motivation_for_medicine: { label: 'Motivation for medicine', strongest: 'Connects personal motivation to a realistic understanding of medicine.', action: 'Link one experience to what it taught you about the work of a doctor.', review: 'Revisit your motivation with a different personal example.' },
  reflection: { label: 'Reflection', strongest: 'Explains what changed after an experience, not only what happened.', action: 'Explain what you learned and what you would do differently now.', review: 'Practise turning description into genuine reflection.' },
  healthcare_awareness: { label: 'Healthcare awareness', strongest: 'Recognises patient safety, systems and professional boundaries.', action: 'Name the immediate safety issue and the appropriate person or service to involve.', review: 'Revisit safe escalation in a different healthcare context.' },
  adaptability: { label: 'Adaptability', strongest: 'Adjusts the approach when circumstances or information change.', action: 'Describe the cue that would make you change your plan.', review: 'Practise adapting when the first approach does not work.' },
}

const stationById = new Map<string, (typeof INTERVIEW_STATION_METADATA)[number]>(INTERVIEW_STATION_METADATA.map(station => [station.id, station]))

const MATCHERS: Record<InterviewCompetency, RegExp> = {
  communication: /communication|listening|interpreter|misinformation|feedback|rapport|explain|panel/i,
  empathy: /empathy|dignity|support|safeguard|patient|access|inclusion|harassment|homeless/i,
  ethical_reasoning: /ethic|integrity|confidential|fair|privacy|consent|autonomy|prioriti|conflict|safety/i,
  teamwork: /team|leader|colleague|group|disagreement|working relationship/i,
  motivation_for_medicine: /motivation|medicine|medical career|why medicine/i,
  reflection: /reflection|mistake|error|learn|responsibility|resilience|experience/i,
  healthcare_awareness: /health|clinical|patient safety|doctor|rural|public health|discharge|scope/i,
  adaptability: /adapt|problem solving|pressure|competing demands|uncertain|change|access/i,
}

export function competencyLabel(competency: InterviewCompetency) { return COPY[competency].label }

export function competenciesForStation(stationId: string): InterviewCompetency[] {
  const station = stationById.get(stationId)
  if (!station) return ['communication']
  const text = `${station.title} ${station.category}`
  const matched = INTERVIEW_COMPETENCIES.filter(competency => MATCHERS[competency].test(text))
  const primary = matched.slice(0, 3)
  if (!primary.includes('communication') && primary.length < 2) primary.push('communication')
  return primary.length ? primary : ['communication']
}

function daysBetween(from: string, to: string) {
  return Math.max(0, Math.round((Date.parse(to + 'T12:00:00Z') - Date.parse(from + 'T12:00:00Z')) / 86_400_000))
}

function evidenceScore(log: PracticeLog) {
  if (log.self_rating !== null) return Math.max(.2, Math.min(1, log.self_rating / 5))
  return .5
}

function stateFor(score: number, attempts: number): MasteryState {
  if (attempts === 0) return 'Starting'
  if (attempts < 3 || score < 48) return 'Developing'
  if (attempts >= 7 && score >= 78) return 'Interview-ready'
  if (attempts >= 5 && score >= 66) return 'Strong'
  return 'Consistent'
}

export function buildCompetencyMastery(logs: PracticeLog[], today: string, evidence: CompetencyEvidence[] = []): CompetencyMastery[] {
  const complete = completedLogs(logs).filter(log => practiceDay(log.completed_at!) <= today)
  return INTERVIEW_COMPETENCIES.map(competency => {
    const relevant = complete.filter(log => competenciesForStation(log.station_id).includes(competency)).sort((a, b) => a.completed_at!.localeCompare(b.completed_at!))
    const evidencePriority = { legacy: 0, self_rating: 1, automated: 2, tutor: 3 }
    const relevantIds = new Set(relevant.map(log => log.id))
    const competencyEvidence = evidence.filter(item => item.competency === competency && practiceDay(new Date(item.observedAt)) <= today)
    const weighted = relevant.map(log => {
      const day = practiceDay(log.completed_at!)
      const weight = Math.pow(.5, daysBetween(day, today) / INTERVIEW_PROGRESSION_CONFIG.masteryHalfLifeDays)
      const signal = competencyEvidence.filter(item => item.practiceLogId === log.id).sort((a, b) => evidencePriority[b.source] - evidencePriority[a.source])[0]
      return { day, score: signal ? Math.max(0, Math.min(1, signal.score)) : evidenceScore(log), weight }
    }).concat(competencyEvidence.filter(item => !item.practiceLogId || !relevantIds.has(item.practiceLogId)).map(item => {
      const day = practiceDay(new Date(item.observedAt))
      return { day, score: Math.max(0, Math.min(1, item.score)), weight: Math.pow(.5, daysBetween(day, today) / INTERVIEW_PROGRESSION_CONFIG.masteryHalfLifeDays) }
    })).sort((a, b) => a.day.localeCompare(b.day))
    const weight = weighted.reduce((sum, item) => sum + item.weight, 0)
    const raw = weight ? weighted.reduce((sum, item) => sum + item.score * item.weight, 0) / weight : 0
    // Confidence grows across several attempts; one unusually high rating cannot create mastery.
    const confidence = Math.min(1, weighted.length / 5)
    const lastPractised = weighted.at(-1)?.day ?? null
    const age = lastPractised ? daysBetween(lastPractised, today) : 999
    // A quiet recency factor makes stale mastery soften gradually without
    // deleting prior achievement; retention carries the stronger decay signal.
    const recency = weighted.length ? .7 + .3 * Math.pow(.5, age / 90) : 1
    const score = Math.round((raw * confidence + .35 * (1 - confidence)) * recency * 100)
    const recent = weighted.slice(-3), earlier = weighted.slice(-6, -3)
    const mean = (items: typeof weighted) => items.length ? items.reduce((sum, item) => sum + item.score, 0) / items.length : null
    const recentMean = mean(recent), earlierMean = mean(earlier)
    const trend: MasteryTrend = recentMean === null || earlierMean === null ? 'Steady' : recentMean - earlierMean >= .08 ? 'Building' : recentMean - earlierMean <= -.08 ? 'Needs attention' : 'Steady'
    const repetition = Math.min(1, weighted.length / 6)
    const retention = weighted.length ? Math.round(100 * Math.exp(-age / 60) * (.55 + .45 * repetition)) : 0
    const intervalIndex = raw >= .8 ? 4 : raw >= .68 ? 3 : raw >= .55 ? 2 : raw >= .4 ? 1 : 0
    const reviewDue = weighted.length > 0 && age >= INTERVIEW_PROGRESSION_CONFIG.reviewIntervalsDays[intervalIndex]
    const stationIds = [...new Set(relevant.map(item => item.station_id))]
    return {
      competency,
      label: COPY[competency].label,
      state: stateFor(score, weighted.length),
      score,
      trend,
      retention,
      attempts: weighted.length,
      strongestBehaviour: competencyEvidence.find(item => item.source === 'tutor' && item.behaviour)?.behaviour ?? (weighted.length >= 3 ? COPY[competency].strongest : 'Not enough reviewed evidence yet.'),
      nextAction: COPY[competency].action,
      lastPractised,
      reviewDue,
      reviewReason: COPY[competency].review,
      history: weighted.slice(-8).map(item => ({ day: item.day, score: Math.round(item.score * 100) })),
      stationIds,
      stationTitles: stationIds.flatMap(id => { const title = stationById.get(id)?.title; return title ? [String(title)] : [] }),
      repeatedFeedbackPatterns: [...new Set(competencyEvidence.map(item => item.evidenceExcerpt).filter((value): value is string => Boolean(value)))].slice(0, 2),
      completedQuests: 0,
    }
  })
}

function stableNumber(value: string) {
  let hash = 2166136261
  for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619)
  return hash >>> 0
}

function comparison(first?: { id: string; duration: number; rating: number | null }, retry?: { id: string; duration: number; rating: number | null }) {
  if (!first || !retry) return undefined
  if (first.rating !== null && retry.rating !== null && retry.rating > first.rating) return `Your self-rating moved from ${first.rating}/5 to ${retry.rating}/5. Treat that as a reflection, not a precise score.`
  return 'Both attempts are saved against the same scenario so you can compare the structure, evidence and targeted behaviour directly.'
}

export function selectDailyStation(userKey: string, today: string, mastery: CompetencyMastery[], logs: PracticeLog[], stored?: Partial<DailyStation>, allowedStationIds?: readonly string[]): DailyStation {
  const existing = stored?.stationId ? stationById.get(stored.stationId) : undefined
  const due = mastery.filter(item => item.reviewDue).sort((a, b) => a.retention - b.retention || a.score - b.score)
  const target = due[0] ?? [...mastery].sort((a, b) => a.score - b.score || a.attempts - b.attempts)[0]
  const recentIds = new Set(completedLogs(logs).slice(-6).map(log => log.station_id))
  const allowed = allowedStationIds?.length ? new Set(allowedStationIds) : null
  const catalogue = allowed ? INTERVIEW_STATION_METADATA.filter(station => allowed.has(station.id)) : INTERVIEW_STATION_METADATA
  const candidates = catalogue.filter(station => competenciesForStation(station.id).includes(target.competency))
  const varied = candidates.filter(station => !recentIds.has(station.id))
  const pool = varied.length ? varied : candidates
  const chosen = existing ?? pool[stableNumber(`${userKey}:${today}:${target.competency}`) % Math.max(1, pool.length)] ?? catalogue[0] ?? INTERVIEW_STATION_METADATA[0]
  const format = chosen.format as 'mmi' | 'panel'
  const firstAttempt = stored?.firstAttempt
  const retry = stored?.retry
  const phase = stored?.phase ?? 'answer'
  return {
    id: stored?.id ?? `daily-${today}`,
    day: today,
    stationId: chosen.id,
    title: chosen.title,
    format,
    preparation: format === 'mmi' ? '2 min preparation' : 'Think before answering',
    response: format === 'mmi' ? '8 min response' : '5 min focused response',
    competencies: competenciesForStation(chosen.id),
    href: `/interviews/practice/session?format=${format}&station=${encodeURIComponent(chosen.id)}&daily=1`,
    reason: target.reviewDue ? target.reviewReason : `Build ${target.label.toLowerCase()} with one deliberate response.`,
    phase,
    xp: stored?.xp ?? 0,
    firstAttempt,
    retry,
    comparison: comparison(firstAttempt, retry),
  }
}

export function buildConsistency(logs: PracticeLog[], today: string, currentDays = 0, personalBestDays = 0, graceAvailable = true): ConsistencyProgress {
  const meaningfulDays = new Set(completedLogs(logs).filter(log => log.duration_seconds >= INTERVIEW_PROGRESSION_CONFIG.minimumMeaningfulSeconds[log.format]).map(log => practiceDay(log.completed_at!)))
  const start = weekStart(today)
  const weekDays = Array.from({ length: 7 }, (_, index) => shiftDay(start, index))
  const activeDays = weekDays.filter(day => day <= today && meaningfulDays.has(day)).length
  const daysRemaining = weekDays.filter(day => day > today).length
  const remaining = Math.max(0, INTERVIEW_PROGRESSION_CONFIG.weeklyActiveDayGoal - activeDays)
  const todayActive = meaningfulDays.has(today)
  const expiresAt = streakExpiryAt(today, todayActive)
  const message = remaining === 0 ? 'Five active days complete. Rest days are part of the plan.'
    : todayActive ? `${remaining} practice ${remaining === 1 ? 'day' : 'days'} left to complete this week.`
    : activeDays >= 4 ? 'A rest day today keeps your consistency intact.'
    : 'Welcome back. Continue where you left off.'
  return { activeDays, goal: INTERVIEW_PROGRESSION_CONFIG.weeklyActiveDayGoal, daysRemaining, todayActive, expiresAt, timeRemaining: streakTimeRemaining(expiresAt), currentDays, personalBestDays: Math.max(currentDays, personalBestDays), graceAvailable, message }
}

export function streakExpiryAt(today: string, todayActive: boolean) {
  return new Date(sydneyMidnight(shiftDay(today, todayActive ? 2 : 1))).toISOString()
}

export function streakTimeRemaining(expiresAt: string, now = Date.now()) {
  const totalMinutes = Math.max(0, Math.ceil((Date.parse(expiresAt) - now) / 60_000))
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function sydneyMidnight(day: string) {
  const [year, month, date] = day.split('-').map(Number)
  const target = Date.UTC(year, month - 1, date)
  let candidate = target - 11 * 60 * 60 * 1000
  const formatter = new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Sydney', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' })
  for (let index = 0; index < 3; index++) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(candidate)).map(part => [part.type, part.value]))
    const rendered = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second))
    candidate += target - rendered
  }
  return candidate
}

export function calculateConsistencyStreak(logs: PracticeLog[], today: string, allowGrace = true): ConsistencyStreak {
  const meaningfulDays = new Set(completedLogs(logs).filter(log => log.duration_seconds >= INTERVIEW_PROGRESSION_CONFIG.minimumMeaningfulSeconds[log.format]).map(log => practiceDay(log.completed_at!)))
  let cursor = meaningfulDays.has(today) ? today : shiftDay(today, -1), days = 0, usedGrace = false
  // Today remains open until midnight, so an unfinished day never breaks an existing streak.
  for (let index = 0; index < 3650; index++, cursor = shiftDay(cursor, -1)) {
    if (meaningfulDays.has(cursor)) { days++; continue }
    const priorDay = shiftDay(cursor, -1)
    if (allowGrace && !usedGrace && cursor.slice(0, 7) === today.slice(0, 7) && meaningfulDays.has(priorDay)) { usedGrace = true; continue }
    break
  }
  return { days, usedGrace }
}

export function buildReviewQueue(mastery: CompetencyMastery[], today: string, allowedStationIds?: readonly string[]): ReviewDue[] {
  return mastery.filter(item => item.reviewDue).sort((a, b) => a.retention - b.retention || a.score - b.score).slice(0, INTERVIEW_PROGRESSION_CONFIG.maximumVisibleReviews).map(item => {
    const station = reviewStationForCompetency(item.competency, item.stationIds.at(-1), allowedStationIds)
    return { id: `${item.competency}:${today}`, competency: item.competency, label: item.label, reason: item.reviewReason, dueDay: today, href: `/interviews/practice/session?format=${station.format}&station=${encodeURIComponent(station.id)}&review=${item.competency}` }
  })
}

export function reviewStationForCompetency(competency: InterviewCompetency, excludedStationId?: string, allowedStationIds?: readonly string[]) {
  const allowed = allowedStationIds?.length ? new Set(allowedStationIds) : null
  const catalogue = allowed ? INTERVIEW_STATION_METADATA.filter(station => allowed.has(station.id)) : INTERVIEW_STATION_METADATA
  return catalogue.find(candidate => candidate.id !== excludedStationId && competenciesForStation(candidate.id).includes(competency))
    ?? catalogue.find(candidate => competenciesForStation(candidate.id).includes(competency))
    ?? catalogue[0]
    ?? INTERVIEW_STATION_METADATA[0]
}

export function inferredReviewStage(item: CompetencyMastery) {
  if (item.score >= 78) return 4
  if (item.score >= 66) return 3
  if (item.score >= 50) return 2
  if (item.score >= 38) return 1
  return 0
}

export function suggestedQuest(competency: InterviewCompetency, id = `suggested-${competency}`): FeedbackQuest {
  return { id, behaviour: COPY[competency].action, status: 'assigned', competencies: [competency], evidence: null, source: 'automated' }
}

export function legacyProgression(userKey: string, logs: PracticeLog[], today: string, allowedStationIds?: readonly string[]): InterviewProgressionData {
  const mastery = buildCompetencyMastery(logs, today)
  const daily = selectDailyStation(userKey, today, mastery, logs, undefined, allowedStationIds)
  const weakest = [...mastery].sort((a, b) => a.score - b.score || a.attempts - b.attempts)[0]
  const quest = suggestedQuest(weakest.competency)
  return { available: true, durable: false, totalXp: 0, daily, quest, activeQuests: [quest], consistency: buildConsistency(logs, today), mastery, reviews: buildReviewQueue(mastery, today, allowedStationIds), rewards: buildInterviewRewards(0) }
}

export function progressionPreview(userKey: string, logs: PracticeLog[], today: string): InterviewProgressionData {
  const data = legacyProgression(userKey, logs, today)
  const first = logs.find(log => log.station_id === data.daily.stationId)
  return {
    ...data,
    durable: true,
    totalXp: 230,
    daily: { ...data.daily, phase: 'review', xp: 20, firstAttempt: first ? { id: first.id, duration: first.duration_seconds, rating: first.self_rating } : { id: 'preview-attempt', duration: 326, rating: 3 } },
    consistency: { ...data.consistency, currentDays: 3, personalBestDays: 5 },
    rewards: buildInterviewRewards(230, 3, [{ badge_key: 'feedback_in_action', earned_at: `${today}T02:00:00Z` }, { badge_key: 'specific_storyteller', earned_at: `${today}T02:00:00Z` }]),
  }
}

export function weekKey(day: string) { return weekStart(day) }
