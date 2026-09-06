import { INTERVIEW_STATIONS } from './stations'

export const PRACTICE_TIME_ZONE = 'Australia/Sydney'
const dayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: PRACTICE_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' })
export type PracticeLog = { id: string; station_id: string; format: 'mmi' | 'panel'; source: 'rehearsal' | 'recording'; completed_at: string | null; duration_seconds: number; self_rating: number | null }
export type ThemeSummary = { theme: string; count: number; rated: number; average: number | null }
export type PracticeSuggestion = { theme: string; stationId: string; title: string; format: 'mmi' | 'panel'; reason: string; href: string }
export type PracticeProgressData = { today: string; month: string; logs: PracticeLog[]; available: boolean; suggestions: PracticeSuggestion[]; thisWeek: { count: number; average: number | null; activeDays: number } }
const stations = new Map(INTERVIEW_STATIONS.map(station => [station.id, station]))
export const PRACTICE_THEMES = [...new Set(INTERVIEW_STATIONS.map(station => station.category.split(' · ')[0]))].sort()
export function themeForStation(id: string) { return stations.get(id)?.category.split(' · ')[0] ?? 'Other' }
export function practiceDay(timestamp: string | Date): string {
  const date = new Date(timestamp)
  if (!Number.isFinite(date.getTime())) return ''
  return dayFormatter.format(date)
}
// Calendar arithmetic operates on date keys in UTC, never elapsed local hours.
export function shiftDay(day: string, amount: number) { const date = new Date(day + 'T12:00:00Z'); date.setUTCDate(date.getUTCDate() + amount); return date.toISOString().slice(0, 10) }
export function weekStart(day: string) { const weekday = new Date(day + 'T12:00:00Z').getUTCDay(); return shiftDay(day, -((weekday + 6) % 7)) }
export function shiftMonth(month: string, amount: number) { const date = new Date(month + '-01T12:00:00Z'); date.setUTCMonth(date.getUTCMonth() + amount); return date.toISOString().slice(0, 7) }
export function monthDays(month: string): Array<string | null> {
  const first = month + '-01', offset = (new Date(first + 'T12:00:00Z').getUTCDay() + 6) % 7
  const days = new Date(shiftMonth(month, 1) + '-01T12:00:00Z'); days.setUTCDate(0)
  const result: Array<string | null> = Array(offset).fill(null)
  for (let day = 1; day <= days.getUTCDate(); day++) result.push(`${month}-${String(day).padStart(2, '0')}`)
  while (result.length < 42) result.push(null)
  return result
}
export function validProgressMonth(value: unknown, today: string) { return typeof value === 'string' && /^20\d{2}-(0[1-9]|1[0-2])$/.test(value) && value >= '2020-01' && value <= today.slice(0, 7) ? value : today.slice(0, 7) }
export function progressRange(month: string) {
  const from = weekStart(shiftMonth(month, -1) + '-01')
  const last = shiftDay(shiftMonth(month, 1) + '-01', -1)
  return { from, until: shiftDay(weekStart(last), 7) }
}
export function completedLogs(logs: PracticeLog[]) {
  return [...new Map(logs.filter(log => log.completed_at && practiceDay(log.completed_at)).map(log => [log.id, log])).values()]
}
export function logsInWeek(logs: PracticeLog[], start: string) { const until = shiftDay(start, 7); return completedLogs(logs).filter(log => { const day = practiceDay(log.completed_at!); return day >= start && day < until }) }
export function averageRating(logs: PracticeLog[]) { const rated = logs.map(log => log.self_rating).filter((rating): rating is number => Number.isInteger(rating) && rating! >= 1 && rating! <= 5); return rated.length ? rated.reduce((sum, value) => sum + value, 0) / rated.length : null }
export function summariseThemes(logs: PracticeLog[]): ThemeSummary[] {
  const complete = completedLogs(logs), themes = [...PRACTICE_THEMES]
  if (complete.some(log => themeForStation(log.station_id) === 'Other')) themes.push('Other')
  return themes.map(theme => { const rows = complete.filter(log => themeForStation(log.station_id) === theme); return { theme, count: rows.length, rated: rows.filter(log => Number.isInteger(log.self_rating) && log.self_rating! >= 1 && log.self_rating! <= 5).length, average: averageRating(rows) } })
}
export function suggestPractice(logs: PracticeLog[], today: string): PracticeSuggestion[] {
  const recent = completedLogs(logs).filter(log => { const day = practiceDay(log.completed_at!); return day >= shiftDay(today, -27) && day <= today })
  const candidates = PRACTICE_THEMES.map(theme => {
    const rows = recent.filter(log => themeForStation(log.station_id) === theme), average = averageRating(rows)
    const last = rows.map(log => practiceDay(log.completed_at!)).sort().at(-1)
    const gap = last ? Math.round((Date.parse(today) - Date.parse(last)) / 86400000) : 28
    const priority = rows.length === 0 ? 4 : Math.max(0, 4 - (average ?? 4)) * 2 + Math.min(3, gap / 7) + 1 / (rows.length + 1)
    const station = INTERVIEW_STATIONS.filter(station => themeForStation(station.id) === theme).sort((a, b) => recent.filter(log => log.station_id === a.id).length - recent.filter(log => log.station_id === b.id).length || a.id.localeCompare(b.id))[0]
    const rated = rows.filter(log => log.self_rating !== null).length
    const reason = average !== null && average < 3.5 ? `Your recent self-rating averages ${average.toFixed(1)}/5 across ${rated} rated ${rated === 1 ? 'practice' : 'practices'}.`
      : rows.length === 0 ? 'You haven’t practised this theme in the past 28 days.'
      : gap >= 7 ? `It’s been ${gap} days since you last practised this theme.`
      : `You’ve practised this theme ${rows.length} ${rows.length === 1 ? 'time' : 'times'} in the past 28 days. Keep it in your rotation.`
    return { theme, stationId: station.id, title: station.title, format: station.format, reason, href: `/interviews/practice/session?format=${station.format}&station=${encodeURIComponent(station.id)}`, priority }
  })
  return candidates.sort((a, b) => b.priority - a.priority || a.theme.localeCompare(b.theme)).slice(0, 3).map(candidate => ({ theme: candidate.theme, stationId: candidate.stationId, title: candidate.title, format: candidate.format, reason: candidate.reason, href: candidate.href }))
}
