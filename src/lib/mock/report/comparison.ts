import { cognitiveTotal, estimateAnzSjtScore, estimateCognitiveScore, isCognitiveSection } from '../../ucat/scoring'
import type { ReportFact, ReportHistory } from './types'

export function historicalScores(facts: ReportFact[], qrTopScoreRaw: 35 | 36 = 36) {
  const sections = [...new Set(facts.map(q => q.section))].map(slug => {
    const rows = facts.filter(q => q.section === slug)
    const raw = rows.reduce((n, q) => n + q.score, 0), maximum = rows.reduce((n, q) => n + q.maximum, 0)
    const scaled = maximum <= 0 ? null : isCognitiveSection(slug) ? estimateCognitiveScore(slug, raw, maximum, qrTopScoreRaw) : slug === 'situational-judgement' ? estimateAnzSjtScore(raw, maximum) : null
    return { slug, accuracy: maximum > 0 ? raw / maximum * 100 : 0, scaled }
  })
  return { sections, totalScore: cognitiveTotal(Object.fromEntries(sections.filter(s => isCognitiveSection(s.slug)).map(s => [s.slug, s.scaled]))) }
}

/** Use earlier completed mocks only. The current result never contributes to its own baseline. */
export function previousMockComparison(history: ReportHistory[], currentId: string, completedAt: string, currentScore: number | null, section?: string) {
  const scores = history.filter(h => h.id !== currentId && Date.parse(h.completedAt) < Date.parse(completedAt))
    .sort((a,b) => Date.parse(a.completedAt) - Date.parse(b.completedAt))
    .map(h => section ? h.sections.find(s => s.slug === section)?.scaled : h.totalScore)
    .filter((score): score is number => typeof score === 'number' && Number.isFinite(score))
    .slice(-10)
  const average = scores.length ? Math.round(scores.reduce((n, score) => n + score, 0) / scores.length) : null
  return { count: scores.length, average, delta: average == null || currentScore == null ? null : currentScore - average, scores }
}
