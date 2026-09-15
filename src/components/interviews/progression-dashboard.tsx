'use client'

import Link from 'next/link'
import { trackAnalyticsEvent } from '@/components/analytics'
import { useEffect, useState, type ReactNode } from 'react'
import { Cyto } from '@/components/ui/cyto'
import { INTERVIEW_PROGRESSION_CONFIG, streakTimeRemaining, type CompetencyMastery, type FeedbackQuest, type InterviewCompetency, type InterviewProgressionData } from '@/lib/interviews/progression'
import styles from './progression-dashboard.module.css'

const phaseIndex = { answer: 0, review: 1, retry: 2, complete: 3 } as const
const masteryStages = ['Starting', 'Developing', 'Consistent', 'Strong', 'Interview-ready'] as const
const competencySummaries: Record<InterviewCompetency, string> = {
  communication: 'Clear structure, listening and easy-to-follow explanations.',
  empathy: 'Recognising another person’s perspective and responding with care.',
  ethical_reasoning: 'Balancing duties, risks and fairness before deciding.',
  teamwork: 'Listening, contributing and handling disagreement constructively.',
  motivation_for_medicine: 'Connecting personal experience to a realistic view of medicine.',
  reflection: 'Explaining what you learned and what you would change next time.',
  healthcare_awareness: 'Recognising safety, systems and professional boundaries.',
  adaptability: 'Adjusting your approach when information or circumstances change.',
}

export function InterviewProgressionDashboard({ data, continueCard, shopHref = '/interviews/focus-shop' }: { data: InterviewProgressionData; continueCard?: ReactNode; shopHref?: string }) {
  const [quest, setQuest] = useState(data.quest), [questMessage, setQuestMessage] = useState(''), [questPending, setQuestPending] = useState(false)
  const questAlternatives = quest ? data.activeQuests.filter(item => item.id !== quest.id) : []
  const remainingPracticeDays = Math.max(0, data.consistency.goal - data.consistency.activeDays)
  const streakProgress = Math.min(100, Math.round((data.consistency.activeDays / data.consistency.goal) * 100))
  const streakCountdown = useStreakCountdown(data.consistency.expiresAt, data.consistency.timeRemaining, data.consistency.currentDays)
  const dailyXpPercent = Math.min(100, Math.round((data.daily.xp / INTERVIEW_PROGRESSION_CONFIG.dailyXp) * 100))
  const strongCompetencies = data.mastery.filter(item => item.state === 'Strong' || item.state === 'Interview-ready').length
  const nextCompetency = data.mastery.slice().sort((a, b) => a.score - b.score)[0]
  const dailyAction = data.daily.phase === 'answer'
    ? { label: 'Start today’s station', href: data.daily.href }
    : data.daily.phase === 'review' && data.daily.firstAttempt
      ? { label: 'Review transcript', href: `/interviews/practice/recordings?attempt=${encodeURIComponent(data.daily.firstAttempt.id)}&progression=review` }
      : data.daily.phase === 'retry'
        ? { label: 'Retry with one improvement', href: data.daily.href }
        : { label: 'Practise again', href: data.daily.href }
  return <div className={styles.stack}>
    <div className={styles.openingGrid} data-has-continue={Boolean(continueCard)}>
    <section className={styles.daily} aria-labelledby="daily-station-title" data-interview-tour="dashboard-daily">
      <div className={styles.dailyTop}>
        <div><p className={styles.eyebrow}>Today’s Daily Station</p><h2 id="daily-station-title">{data.daily.title}</h2><p className={styles.dailyReason}>{data.daily.reason}</p></div>
        <div className={styles.xp}><strong>{data.daily.xp}<small>XP</small></strong><span>of {INTERVIEW_PROGRESSION_CONFIG.dailyXp} today · {data.totalXp} total</span><div aria-label={`${dailyXpPercent}% of today’s XP goal`}><i style={{ width: `${dailyXpPercent}%` }} /></div></div>
      </div>
      <div className={styles.dailyFacts}><Fact label="Format" value={data.daily.format === 'mmi' ? 'MMI scenario' : 'Panel-style question'} /><Fact label="Preparation" value={data.daily.preparation} /><Fact label="Response" value={data.daily.response} /><Fact label="Primary competencies" value={data.daily.competencies.map(readable).join(' · ')} /></div>
      <ol className={styles.loop} aria-label="Daily Station progression">
        {['Answer', 'Review transcript and feedback', 'Retry one targeted improvement'].map((label, index) => <li key={label} data-state={index < phaseIndex[data.daily.phase] || data.daily.phase === 'complete' ? 'complete' : index === phaseIndex[data.daily.phase] ? 'current' : 'upcoming'}><span>{index < phaseIndex[data.daily.phase] || data.daily.phase === 'complete' ? '✓' : index + 1}</span><p>{label}</p></li>)}
      </ol>
      {data.daily.comparison && <p className={styles.comparison}>{data.daily.comparison}</p>}
      <div className={styles.dailyAction}><Link data-haptic="confirm" href={dailyAction.href} onClick={() => trackAnalyticsEvent('interview_daily_station_action', { phase: data.daily.phase, format: data.daily.format })}>{dailyAction.label} <Arrow /></Link></div>
    </section>
    {continueCard}
    </div>

    <RewardsOverview rewards={data.rewards} shopHref={shopHref} />

    <div className={styles.priorityGrid}>
      <section className={styles.quest} aria-labelledby="feedback-quest-title" data-interview-tour="dashboard-quest">
        <div className={styles.sectionHeading}><div className={styles.questTitle}><span><Target /></span><h2 id="feedback-quest-title">Feedback quest</h2></div>{quest && <Status value={quest.status} />}</div>
        {quest ? <><blockquote>“{quest.behaviour}”</blockquote><p>{quest.competencies.map(readable).join(' · ')}{quest.source === 'tutor' ? ' · Set by your tutor' : ''}</p>{quest.evidence && <div className={styles.evidence}><span>Evidence saved</span><p>{quest.evidence}</p></div>}<div className={styles.questActions}><button disabled={questPending} onClick={() => chooseQuest(quest.competencies[0], quest.id)}>Use this quest</button>{quest.source !== 'tutor' && <details><summary>Choose another</summary><div>{questAlternatives.length ? questAlternatives.map(item => <button key={item.id} disabled={questPending} onClick={() => chooseQuest(item.competencies[0], item.id)}>{item.behaviour}</button>) : data.mastery.slice().sort((a,b) => a.score-b.score).slice(0,3).filter(item => !quest.competencies.includes(item.competency)).map(item => <button key={item.competency} disabled={questPending} onClick={() => chooseQuest(item.competency)}>{item.label}</button>)}</div></details>}</div>{questMessage && <p role="status" className={styles.questMessage}>{questMessage}</p>}</> : <p className={styles.empty}>Review your next response and one concise quest will appear here.</p>}
      </section>
      <section className={styles.consistency} aria-labelledby="consistency-title" data-interview-tour="dashboard-streak">
        <div className={styles.streakTop}>
          <div className={styles.streakHeading}><span className={styles.streakFlame}><Flame /><strong>{data.consistency.currentDays}</strong></span><div><h2 id="consistency-title">Study Streak</h2><p>{data.consistency.currentDays === 0 ? 'Practise today to light your streak.' : `${data.consistency.currentDays}-day streak`}</p></div></div>
          <div className={styles.streakCountdown} data-secured={data.consistency.todayActive} aria-label={streakCountdown.ariaLabel}><Clock /><span><strong>{streakCountdown.value}</strong>{streakCountdown.label ? ` ${streakCountdown.label}` : ''}</span></div>
        </div>
        <div className={styles.streakBody}>
          <div className={styles.streakCyto}><Cyto mood={remainingPracticeDays === 0 ? 'happy' : 'studying'} size={72} title="Cyto tending your daily study streak" /></div>
          <div className={styles.streakJourney}>
            <div className={styles.dayDots} aria-label={`${data.consistency.activeDays} of ${data.consistency.goal} active days`}>
              {Array.from({ length: data.consistency.goal }, (_, index) => <span key={index} data-complete={index < data.consistency.activeDays} data-next={index === data.consistency.activeDays && remainingPracticeDays > 0} aria-label={`Practice day ${index + 1}${index < data.consistency.activeDays ? ' complete' : index === data.consistency.activeDays && remainingPracticeDays > 0 ? ' next' : ''}`}>{index < data.consistency.activeDays ? <Check /> : index + 1}</span>)}
            </div>
            <div className={styles.streakTrack} role="progressbar" aria-label="Weekly practice goal progress" aria-valuemin={0} aria-valuemax={data.consistency.goal} aria-valuenow={data.consistency.activeDays}><i style={{ width: `${streakProgress}%` }} /></div>
            <div className={styles.consistencyTask}><strong>{remainingPracticeDays === 0 ? 'Weekly goal complete' : remainingPracticeDays === 1 ? '1 more active day this week' : `${remainingPracticeDays} more active days this week`}</strong><span>{remainingPracticeDays === 0 ? 'Five meaningful practice days are recorded.' : 'Practise today to extend your daily streak.'}</span></div>
          </div>
        </div>
        <div className={styles.consistencyFooter}><div className={styles.consistencyMeta}><span><Trophy /> Best {data.consistency.personalBestDays} days</span><span data-ready={data.consistency.graceAvailable}><ShieldSpark /> {data.consistency.graceAvailable ? 'Streak shield ready' : 'Streak shield used'}</span></div>{remainingPracticeDays > 0 && <Link data-haptic="confirm" href="/interviews/practice">Practise today <Arrow /></Link>}</div>
      </section>
    </div>

    <section className={styles.mastery} aria-labelledby="mastery-title" data-interview-tour="dashboard-mastery">
      <div className={styles.masteryHeader}>
        <div className={styles.masteryIntro}><div className={styles.masteryTitle}><h2 id="mastery-title">Competency mastery</h2><details className={styles.info}><summary aria-label="How mastery is calculated">i</summary><p>These are learning signals, not admission predictions. Levels rise through repeated, recent evidence; one strong response cannot create mastery on its own.</p></details></div><p>See what each interview skill means, why it is at this level and exactly what to practise next.</p></div>
        <div className={styles.masteryCoach}><Cyto mood={strongCompetencies > 1 ? 'happy' : 'studying'} size={66} title="Cyto checking your competency progress" /><p><strong>{strongCompetencies ? `${strongCompetencies} ${strongCompetencies === 1 ? 'skill is' : 'skills are'} looking strong` : 'Your map is taking shape'}</strong><span>{nextCompetency ? `Next focus · ${nextCompetency.label}` : 'Complete a station to begin'}</span></p></div>
      </div>
      <div className={styles.masteryGuide} aria-label="Mastery level progression">
        <div><strong>How levels grow</strong><span>Repeated, recent evidence moves a skill from Starting to Interview-ready.</span></div>
        <ol>{masteryStages.map((stage, index) => <li key={stage} data-state={stage}><span>{index + 1}</span>{stage}</li>)}</ol>
      </div>
      <div className={styles.masteryGrid}>{data.mastery.map(item => <MasteryCard key={item.competency} item={item} />)}</div>
    </section>

    <section className={styles.reviews} aria-labelledby="reviews-title">
      <div className={styles.sectionHeading}><h2 id="reviews-title">Reviews due soon</h2><span>{data.reviews.length} shown</span></div>
      {data.reviews.length ? <div className={styles.reviewList}>{data.reviews.map(review => <article key={review.id}><div><strong>{review.label}</strong><p>{review.reason}</p></div><Link data-haptic="soft" href={review.href} onClick={() => trackAnalyticsEvent('interview_spaced_review_opened', { competency: review.competency })}>Practise a new scenario <Arrow /></Link></article>)}</div> : <p className={styles.empty}>Nothing is due right now. Today’s station will keep your practice balanced.</p>}
    </section>
  </div>

  async function chooseQuest(competency: InterviewCompetency, questId?: string) {
    if (questPending) return
    setQuestPending(true); setQuestMessage('')
    try {
      const response = await fetch('/api/interviews/progression/quest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ competency, questId }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Your Feedback Quest could not be updated.')
      setQuest(payload.quest as FeedbackQuest); setQuestMessage('Feedback Quest saved for today’s station.')
      trackAnalyticsEvent('interview_feedback_quest_selected', { competency })
    } catch (error) { setQuestMessage(error instanceof Error ? error.message : 'Your Feedback Quest could not be updated.') }
    finally { setQuestPending(false) }
  }
}

function useStreakCountdown(expiresAt: string, initialRemaining: string, currentDays: number) {
  const [remaining, setRemaining] = useState(initialRemaining)
  useEffect(() => {
    if (currentDays === 0) return
    const update = () => setRemaining(streakTimeRemaining(expiresAt))
    update()
    const timer = window.setInterval(update, 30_000)
    return () => window.clearInterval(timer)
  }, [currentDays, expiresAt])
  if (currentDays === 0) return { value: 'Start today', label: '', ariaLabel: 'No active daily study streak. Practise today to begin.' }
  return { value: remaining, label: 'left', ariaLabel: `Daily study streak expires in ${remaining}` }
}

function RewardsOverview({ rewards, shopHref }: { rewards: InterviewProgressionData['rewards']; shopHref: string }) {
  const { level } = rewards
  const earned = rewards.badges.filter(badge => badge.earnedAt)
  const [selectedBadgeKey, setSelectedBadgeKey] = useState<string | null>(null)
  const selectedBadge = rewards.badges.find(badge => badge.key === selectedBadgeKey)
  return <section className={styles.rewards} aria-labelledby="practice-level-title" data-interview-tour="dashboard-rewards">
    <div className={styles.levelPanel}>
      <Cyto mood="levelup" size={78} title="Cyto celebrating your practice progress" />
      <div className={styles.levelCopy}>
        <div><h2 id="practice-level-title">{level.name}</h2><span>Level {level.number}</span></div>
        <p>Practice levels reward completed learning steps—not interview scores.</p>
        <div className={styles.levelTrack} aria-label={level.nextName ? `${Math.round(level.progress * 100)}% of the way to ${level.nextName}` : 'Highest practice level reached'}><i style={{ width: `${level.progress * 100}%` }} /></div>
        <small>{level.nextName ? `${level.toNext} XP to ${level.nextName}` : 'Highest practice level reached'}</small>
      </div>
      <dl className={styles.rewardTotals}><div><dt>Total XP</dt><dd>{level.totalXp}</dd></div><div className={styles.tokenTotal}><dt>Focus Tokens</dt><dd><Token />{rewards.focusTokens}</dd><Link data-haptic="soft" href={shopHref} onClick={() => trackAnalyticsEvent('interview_focus_shop_opened', { balance: rewards.focusTokens })}>Visit shop <Arrow /></Link></div></dl>
    </div>
    <div className={styles.badgeShelf}>
      <div className={styles.badgeHeading}><div><h2>Evidence badges</h2><p>Earned through feedback, reflection and retained improvement.</p></div><strong>{earned.length}/{rewards.badges.length}</strong></div>
      <div className={styles.badgeCriterion} id="badge-criterion" data-earned={Boolean(selectedBadge?.earnedAt)} aria-live="polite">
        {selectedBadge ? <><BadgeMark earned={Boolean(selectedBadge.earnedAt)} /><div><strong>{selectedBadge.label}</strong><p>{selectedBadge.criterion}</p></div><button type="button" data-haptic="soft" aria-label="Close badge details" onClick={() => setSelectedBadgeKey(null)}><Close /></button></> : <p className={styles.badgeHint}>Hover, focus or select a badge to see how to earn it.</p>}
      </div>
      <div className={styles.badgeList}>{rewards.badges.map(badge => <div key={badge.key} className={styles.badge} data-earned={Boolean(badge.earnedAt)}><button type="button" data-haptic="soft" aria-label={`${badge.label}. ${badge.criterion}`} aria-expanded={selectedBadgeKey === badge.key} aria-controls="badge-criterion" onClick={() => { const opening = selectedBadgeKey !== badge.key; setSelectedBadgeKey(opening ? badge.key : null); if (opening) trackAnalyticsEvent('interview_reward_badge_opened', { badge: badge.key, earned: Boolean(badge.earnedAt) }) }}><span className={styles.badgeFace}><BadgeMark earned={Boolean(badge.earnedAt)} /><span>{badge.label}</span></span><span className={styles.badgeDescription}>{badge.criterion}</span></button></div>)}</div>
    </div>
  </section>
}

function MasteryCard({ item }: { item: CompetencyMastery }) {
  const feedbackPattern = item.repeatedFeedbackPatterns?.length ? item.repeatedFeedbackPatterns.join(' · ') : 'No repeated concern has appeared yet.'
  const reviewTiming = item.reviewDue ? `Due now · ${item.reviewReason}` : item.lastPractised ? 'Not due yet. We will prompt you as this evidence becomes less recent.' : 'Begins after your first relevant response.'
  const latestEvidence = item.history.at(-1)
  const displayScore = item.attempts ? Math.round(item.score) : 0
  return <details className={styles.masteryCard} data-state={item.state} onToggle={event => { if (event.currentTarget.open) trackAnalyticsEvent('interview_mastery_opened', { competency: item.competency }) }}>
    <summary data-haptic="soft">
      <div className={styles.masteryCardTop}><div><h3>{item.label}</h3><p>{competencySummaries[item.competency]}</p></div><span className={styles.state}>{item.state}</span></div>
      <div className={styles.masteryProgress}><div><span>Mastery score</span><strong>{displayScore}%</strong></div><div className={styles.masteryTrack}><i style={{ width: `${Math.max(0, Math.min(100, displayScore))}%` }} /></div></div>
      <div className={styles.nextActionPreview}><span>Practise next</span><strong>{item.nextAction}</strong></div>
      <span className={styles.expand}><span>Why this level</span><Chevron /></span>
    </summary>
    <div className={styles.masteryDetail}>
      <div className={styles.historyHeading}><div><strong>Recent evidence</strong><span>Up to eight evidence points, with newer work weighted more heavily.</span></div>{latestEvidence && <strong>{latestEvidence.score}% latest</strong>}</div>
      <div className={styles.history} aria-label={`${item.label} recent evidence history`}>{item.history.length ? item.history.map((point, index) => <span key={`${point.day}-${index}`} style={{ height: `${Math.max(12, point.score)}%` }} title={`${point.day}: ${point.score}%`} />) : <p>No evidence yet</p>}</div>
      <dl className={styles.masteryEvidenceGrid}><Fact label="What you have demonstrated" value={item.attempts ? item.strongestBehaviour : 'Complete a relevant station to begin collecting evidence.'} /><Fact label="Pattern to watch" value={feedbackPattern} /><Fact label="Practice included" value={item.stationTitles?.length ? item.stationTitles.slice(-3).join(' · ') : 'Your relevant stations will appear here.'} /><Fact label="Next review" value={reviewTiming} /></dl>
      <div className={styles.masteryAction}><div><span>Your next move</span><strong>{item.nextAction}</strong><small>{item.completedQuests ? `${item.completedQuests} Feedback ${item.completedQuests === 1 ? 'Quest' : 'Quests'} completed for this skill.` : 'Use this as the goal for your next response.'}</small></div><Link data-haptic="confirm" href="/interviews/practice" onClick={() => trackAnalyticsEvent('interview_mastery_practice_opened', { competency: item.competency })}>Find a practice question <Arrow /></Link></div>
    </div>
  </details>
}

function Fact({ label, value }: { label: string; value: string }) { return <div><dt>{label}</dt><dd>{value}</dd></div> }
function Status({ value }: { value: string }) { return <span className={styles.status}>{value.replaceAll('_', ' ')}</span> }
function readable(value: string) { return value.split('_').map(word => word[0].toUpperCase() + word.slice(1)).join(' ') }
function Arrow() { return <svg aria-hidden viewBox="0 0 20 20" fill="none" width="16" height="16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10h11M11 5l5 5-5 5" /></svg> }
function Check() { return <svg aria-hidden viewBox="0 0 16 16" fill="none" width="14" height="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3.5 8.2 2.7 2.7 6.3-6.3" /></svg> }
function Flame() { return <svg aria-hidden viewBox="0 0 20 20" fill="none" width="18" height="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.2 17.2c-3 0-5.2-2-5.2-4.8 0-2.2 1.2-3.8 3-5.7.1 1.7.9 2.7 1.8 3.2-.1-2.8 1.2-5 3.1-7.1.1 2.6 2.1 3.8 2.1 6.7 0 4.5-2.1 7.7-4.8 7.7Z" /><path d="M8.2 14.2c0-1.1.7-2 1.8-3.1.3 1.4 1.8 1.8 1.8 3.1 0 1.3-.8 2.2-1.8 2.2s-1.8-.9-1.8-2.2Z" /></svg> }
function Clock() { return <svg aria-hidden viewBox="0 0 20 20" fill="none" width="16" height="16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="10" r="7" /><path d="M10 6v4l2.7 1.7" /></svg> }
function Trophy() { return <svg aria-hidden viewBox="0 0 20 20" fill="none" width="15" height="15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h8v3.5c0 3-1.6 5-4 5s-4-2-4-5V3Z" /><path d="M6 5H3.5v1.5C3.5 8.4 4.7 9.5 6 9.5M14 5h2.5v1.5c0 1.9-1.2 3-2.5 3M10 11.5V15m-3 2h6M8 15h4" /></svg> }
function ShieldSpark() { return <svg aria-hidden viewBox="0 0 20 20" fill="none" width="15" height="15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2.5 16 5v4.2c0 3.7-2.3 6.4-6 8.3-3.7-1.9-6-4.6-6-8.3V5z" /><path d="m10 6 .7 2.1 2 .9-2 .9L10 12l-.7-2.1-2-.9 2-.9Z" /></svg> }
function Target() { return <svg aria-hidden viewBox="0 0 20 20" fill="none" width="17" height="17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="10" r="6.5" /><circle cx="10" cy="10" r="2.5" /><path d="m12 8 4-4m0 0v3m0-3h-3" /></svg> }
function Chevron() { return <svg aria-hidden viewBox="0 0 20 20" fill="none" width="15" height="15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m7 8 3 3 3-3" /></svg> }
function Close() { return <svg aria-hidden viewBox="0 0 20 20" fill="none" width="15" height="15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="m6 6 8 8M14 6l-8 8" /></svg> }
function Token() { return <svg aria-hidden viewBox="0 0 20 20" fill="none" width="17" height="17" stroke="currentColor" strokeWidth="1.7"><circle cx="10" cy="10" r="7" /><path d="M10 5.8v8.4M6.8 10h6.4" strokeLinecap="round" /></svg> }
function BadgeMark({ earned }: { earned: boolean }) { return <svg aria-hidden viewBox="0 0 24 24" fill="none" width="28" height="28" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m8 16-1 5 5-2.5L17 21l-1-5" /><circle cx="12" cy="10" r="6" />{earned ? <path d="m9.2 10 1.8 1.8 3.8-4" /> : <path d="M9.5 10h5" />}</svg> }
