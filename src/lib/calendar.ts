type TutoringCalendarEvent = {
  id: string
  title: string
  scheduledFor: string
  bookedMinutes: number
  launchUrl: string
}

export function googleCalendarUrl(event: TutoringCalendarEvent) {
  const startsAt = new Date(event.scheduledFor)
  const endsAt = new Date(startsAt.getTime() + event.bookedMinutes * 60_000)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Studocyte tutoring · ${event.title}`,
    dates: `${calendarDate(startsAt)}/${calendarDate(endsAt)}`,
    details: `Start your Zoom lesson securely in Studocyte:\n${event.launchUrl}`,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function tutoringCalendarIcs(event: TutoringCalendarEvent) {
  const startsAt = new Date(event.scheduledFor)
  const endsAt = new Date(startsAt.getTime() + event.bookedMinutes * 60_000)
  const description = `Start your Zoom lesson securely in Studocyte: ${event.launchUrl}`
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Studocyte//Tutoring//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:tutoring-${event.id}@studocyte.emeducate.com.au`,
    `DTSTAMP:${calendarDate(new Date())}`,
    `DTSTART:${calendarDate(startsAt)}`,
    `DTEND:${calendarDate(endsAt)}`,
    `SUMMARY:${escapeIcs(`Studocyte tutoring · ${event.title}`)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n')
}

function calendarDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function escapeIcs(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}
