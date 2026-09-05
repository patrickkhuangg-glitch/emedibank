'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

type DateShortcut = { label: string; offset: number }

const DATE_SHORTCUTS: DateShortcut[] = [
  { label: 'Today', offset: 0 },
  { label: 'Tomorrow', offset: 1 },
  { label: 'Next week', offset: 7 },
]

const TIME_GROUPS = [
  { label: 'Early', start: 0, end: 6 },
  { label: 'Morning', start: 6, end: 12 },
  { label: 'Afternoon', start: 12, end: 17 },
  { label: 'Evening', start: 17, end: 22 },
  { label: 'Late', start: 22, end: 24 },
].map((group) => ({
  label: group.label,
  options: Array.from({ length: (group.end - group.start) * 4 }, (_, index) => {
    const minutes = group.start * 60 + index * 15
    return { value: timeValue(minutes), label: timeLabel(minutes) }
  }),
}))

export function BookingDateTimeFields({ label = 'Lesson date and time' }: { label?: string }) {
  const fieldsetRef = useRef<HTMLFieldSetElement>(null)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [today, setToday] = useState('')

  useEffect(() => {
    const setDefault = () => {
      const next = defaultBrisbaneSlot()
      setToday(brisbaneDateValue(new Date()))
      setDate(next.date)
      setTime(next.time)
    }
    setDefault()
    const form = fieldsetRef.current?.form
    form?.addEventListener('reset', setDefault)
    return () => form?.removeEventListener('reset', setDefault)
  }, [])

  const summary = useMemo(() => formatSummary(date, time), [date, time])

  return (
    <fieldset ref={fieldsetRef} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 sm:col-span-2 sm:p-5">
      <legend className="px-1 text-sm font-semibold text-white">
        {label} <span className="ml-1 font-normal text-white/55">· Brisbane time</span>
      </legend>

      <div className="mt-1 flex flex-wrap gap-2" aria-label="Quick date choices">
        {DATE_SHORTCUTS.map((shortcut) => {
          const shortcutDate = today ? addDays(today, shortcut.offset) : ''
          const active = shortcutDate === date
          return (
            <button
              key={shortcut.label}
              type="button"
              aria-pressed={active}
              disabled={!today}
              onClick={() => setDate(shortcutDate)}
              className={`eb-press rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40 ${active ? 'bg-white text-ink' : 'bg-white/8 text-white/75 hover:bg-white/14 hover:text-white'}`}
            >
              {shortcut.label}
            </button>
          )
        })}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)]">
        <label className="block text-xs font-semibold text-white/70">
          Date
          <input
            required
            type="date"
            name="scheduledDate"
            min={today || undefined}
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="field-dark mt-2 font-mono tabular-nums [color-scheme:dark]"
          />
        </label>
        <label className="block text-xs font-semibold text-white/70">
          Start time
          <select required name="scheduledTime" value={time} onChange={(event) => setTime(event.target.value)} className="field-dark mt-2 font-mono tabular-nums">
            <option value="">Choose a time</option>
            {TIME_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
      </div>

      <input type="hidden" name="scheduledFor" value={date && time ? `${date}T${time}` : ''} />
      <p className="mt-3 flex items-center gap-2 text-xs text-white/60" aria-live="polite">
        <CalendarIcon />
        {summary || 'Choose a date and start time.'}
      </p>
    </fieldset>
  )
}

function defaultBrisbaneSlot() {
  const now = new Date(Date.now() + 60 * 60_000)
  const parts = brisbaneParts(now)
  let totalMinutes = Math.ceil((parts.hour * 60 + parts.minute) / 15) * 15
  let date = `${parts.year}-${two(parts.month)}-${two(parts.day)}`
  if (totalMinutes < 7 * 60) totalMinutes = 9 * 60
  if (totalMinutes >= 22 * 60) {
    date = addDays(date, 1)
    totalMinutes = 9 * 60
  }
  return { date, time: timeValue(totalMinutes) }
}

function brisbaneDateValue(date: Date) {
  const parts = brisbaneParts(date)
  return `${parts.year}-${two(parts.month)}-${two(parts.day)}`
}

function brisbaneParts(date: Date) {
  const values = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Brisbane',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(values.find((value) => value.type === type)?.value ?? 0)
  return { year: part('year'), month: part('month'), day: part('day'), hour: part('hour'), minute: part('minute') }
}

function addDays(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return `${date.getUTCFullYear()}-${two(date.getUTCMonth() + 1)}-${two(date.getUTCDate())}`
}

function formatSummary(date: string, time: string) {
  if (!date || !time) return ''
  const value = new Date(`${date}T${time}:00+10:00`)
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Brisbane',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
  }).format(value)
}

function timeValue(minutes: number) {
  const normalised = minutes % (24 * 60)
  return `${two(Math.floor(normalised / 60))}:${two(normalised % 60)}`
}

function timeLabel(minutes: number) {
  const normalised = minutes % (24 * 60)
  const hour = Math.floor(normalised / 60)
  const minute = normalised % 60
  const displayHour = hour % 12 || 12
  return `${displayHour}:${two(minute)} ${hour < 12 ? 'am' : 'pm'}`
}

function two(value: number) {
  return String(value).padStart(2, '0')
}

function CalendarIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 10h18" /></svg>
}
