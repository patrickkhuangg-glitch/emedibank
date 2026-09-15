/** Uses the same UTC day boundary as the existing dashboard streak. */
export type PracticeDay = { date: string; answers: number }
export type DashboardActivity = { days: PracticeDay[]; todayAnswers: number; activeDays: number }
export function dashboardActivity(answeredAt: string[], now = new Date()): DashboardActivity {
  const today = now.toISOString().slice(0, 10)
  const end = Date.parse(`${today}T00:00:00Z`)
  const counts = new Map<string, number>()
  for (const value of answeredAt) {
    const instant = Date.parse(value)
    if (!Number.isFinite(instant) || instant > now.getTime()) continue
    const day = new Date(instant).toISOString().slice(0, 10)
    counts.set(day, (counts.get(day) ?? 0) + 1)
  }
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(end - (6 - index) * 86400000).toISOString().slice(0, 10)
    return { date, answers: counts.get(date) ?? 0 }
  })
  return { days, todayAnswers: days[6].answers, activeDays: days.filter(d => d.answers > 0).length }
}
