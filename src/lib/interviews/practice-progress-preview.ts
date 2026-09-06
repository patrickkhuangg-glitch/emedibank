import { INTERVIEW_STATIONS } from './stations'
import { averageRating, logsInWeek, practiceDay, shiftDay, suggestPractice, weekStart, type PracticeLog, type PracticeProgressData } from './practice-progress'

// Synthetic values are used only by the explicitly labelled prototype route.
export function practiceProgressPreview(today: string): PracticeProgressData {
  const logs: PracticeLog[] = []
  for (const offset of [0, 1, 3, 5, 8, 12, 15, 18, 23, 28, 33, 38]) {
    for (let index = 0; index < (offset % 4) + 1; index++) {
      const station = INTERVIEW_STATIONS[(offset + index) % INTERVIEW_STATIONS.length]
      logs.push({ id: `preview-${offset}-${index}`, station_id: station.id, format: station.format, source: index % 2 ? 'rehearsal' : 'recording', completed_at: shiftDay(today, -offset) + 'T01:00:00Z', duration_seconds: 180, self_rating: index % 3 === 2 ? null : 2 + (offset + index) % 4 })
    }
  }
  const week = logsInWeek(logs, weekStart(today))
  return { today, month: today.slice(0, 7), logs, available: true, suggestions: suggestPractice(logs, today), thisWeek: { count: week.length, average: averageRating(week), activeDays: new Set(week.map(log => practiceDay(log.completed_at!))).size } }
}
