export type TimelineEvent = {
  id: string
  kind: 'exam' | 'lesson'
  title: string
  detail: string
  date: string
}

const DAY = 86_400_000
export const TIMELINE_LABEL_WIDTH = 176

/** Calendar days in Sydney, rather than elapsed hours (which vary across DST). */
export function timelineDay(value: string | Date): number {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return Date.parse(`${value}T00:00:00Z`) / DAY
  const parts = new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Sydney', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date(value))
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(part => part.type === type)?.value)
  return Date.UTC(get('year'), get('month') - 1, get('day')) / DAY
}

export function buildTimelineScale(events: TimelineEvent[], now: Date) {
  const today = timelineDay(now)
  const upcoming = events.map(event => ({ ...event, day: timelineDay(event.date) })).filter(event => Number.isFinite(event.day) && event.day >= today).sort((a, b) => a.day - b.day)
  const current = new Date(today * DAY)
  const start = today
  const targetMonthLastDay = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 4, 0)).getUTCDate()
  const end = Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 3, Math.min(current.getUTCDate(), targetMonthLastDay)) / DAY
  const formatDay = (day: number) => new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(day * DAY))
  const laterEvents = upcoming.filter(event => event.day > end).map(event => ({ ...event, label: formatDay(event.day) }))
  const span = end - start
  const width = Math.max(480, span * 5)
  const position = (day: number) => (day - start) / span * 100
  const months = []
  for (let month = start; month < end;) {
    const date = new Date(month * DAY)
    months.push({ day: month, position: position(month), label: new Intl.DateTimeFormat('en-AU', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date) })
    month = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1) / DAY
  }
  // Assign overlapping labels to separate rows at the narrowest canvas width.
  const rowEnds: number[] = []
  const placed = upcoming.filter(event => event.day <= end).map(event => {
    const left = position(event.day) / 100 * width
    let row = rowEnds.findIndex(end => end + 20 <= left)
    if (row === -1) row = rowEnds.length
    rowEnds[row] = left + TIMELINE_LABEL_WIDTH
    return { ...event, position: position(event.day), row, label: formatDay(event.day) }
  })
  return { width, months, events: placed, laterEvents, endLabel: formatDay(end), todayPosition: position(today), todayLabel: new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(current) }
}
