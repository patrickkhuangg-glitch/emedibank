'use client'

import Link from 'next/link'
import { useMemo, useState, type ReactNode } from 'react'
import { averageRating, completedLogs, logsInWeek, monthDays, practiceDay, progressRange, shiftDay, shiftMonth, summariseThemes, weekStart, type PracticeProgressData } from '@/lib/interviews/practice-progress'

const control = 'inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-border px-3 py-2 text-sm font-semibold transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-default disabled:opacity-35'
const dateLabel = (day: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-AU', { timeZone: 'UTC', ...options }).format(new Date(day + 'T12:00:00Z'))
const monthLabel = (month: string) => dateLabel(month + '-01', { month: 'long', year: 'numeric' })

export function InterviewPracticeProgress({ data, notes }: { data: PracticeProgressData; notes: ReactNode }) {
  const latest = data.month === data.today.slice(0, 7) ? data.today : shiftDay(shiftMonth(data.month, 1) + '-01', -1)
  const [day, setDay] = useState(latest), [week, setWeek] = useState(weekStart(latest))
  const logs = useMemo(() => completedLogs(data.logs).filter(log => practiceDay(log.completed_at!) <= data.today), [data.logs, data.today])
  const byDay = useMemo(() => { const days = new Map<string, typeof logs>(); for (const log of logs) { const key = practiceDay(log.completed_at!); days.set(key, [...(days.get(key) ?? []), log]) } return days }, [logs])
  const selected = byDay.get(day) ?? [], weekLogs = logsInWeek(logs, week), themes = summariseThemes(weekLogs)
  const range = progressRange(data.month), average = averageRating(weekLogs), activeDays = new Set(weekLogs.map(log => practiceDay(log.completed_at!))).size
  const shownLogs = logs.filter(log => practiceDay(log.completed_at!) >= shiftMonth(data.month, -1) + '-01' && practiceDay(log.completed_at!) < shiftMonth(data.month, 1) + '-01')
  function selectDay(value: string) { setDay(value); setWeek(weekStart(value)) }
  return <>
    <section data-interview-tour="practice-calendar" className="mt-7 rounded-3xl border border-border bg-surface p-5 sm:p-8" aria-labelledby="practice-calendar-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h2 id="practice-calendar-title" className="font-display text-2xl font-semibold tracking-tight">Your practice calendar</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">A little practice, seen over time. Select a day to explore your activity and that week’s themes.</p></div>
        <nav aria-label="Calendar months" className="flex items-center gap-2">{data.month > '2020-01' ? <Link className={control} href={`/interviews?month=${shiftMonth(data.month, -1)}`} aria-label="Show earlier months"><Chevron direction="left" /></Link> : <button className={control} disabled aria-label="Show earlier months"><Chevron direction="left" /></button>}
          <Link href="/interviews" className={control}>Today</Link>{data.month < data.today.slice(0, 7) ? <Link className={control} href={`/interviews?month=${shiftMonth(data.month, 1)}`} aria-label="Show later months"><Chevron direction="right" /></Link> : <button className={control} disabled aria-label="Show later months"><Chevron direction="right" /></button>}</nav>
      </div>
      {!data.available ? <div role="status" className="mt-6 rounded-xl bg-surface-muted p-5"><p className="font-semibold">Your practice history couldn’t load.</p><p className="mt-2 text-sm text-muted">Your saved recordings are still available. Reload this page to try again.</p><a href={`/interviews?month=${data.month}`} className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-brand">Reload practice history</a></div> : <>
        <div className="mt-7 grid gap-x-12 gap-y-8 md:grid-cols-2">{[shiftMonth(data.month, -1), data.month].map(month => <section key={month} aria-label={monthLabel(month)}>
          <h3 className="font-display text-lg font-semibold">{monthLabel(month)}</h3>
          <div className="mt-4 grid grid-cols-7 gap-1 text-center sm:gap-2">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(label => <span key={label} className="pb-2 text-xs font-medium text-muted">{label}</span>)}
            {monthDays(month).map((date, index) => {
              if (!date) return <span key={`empty-${index}`} aria-hidden className="min-h-11" />
              const count = byDay.get(date)?.length ?? 0, future = date > data.today, isToday = date === data.today
              const colour = count >= 4 ? 'bg-mint-deep text-white' : count >= 2 ? 'bg-mint text-ink' : count === 1 ? 'bg-mint-muted text-mint-deep' : 'bg-surface-muted/65 text-muted'
              return <button key={date} type="button" disabled={future} aria-pressed={date === day} aria-current={isToday ? 'date' : undefined} aria-label={`${dateLabel(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}, ${future ? 'future date' : `${count} completed ${count === 1 ? 'practice' : 'practices'}`}`} onClick={() => selectDay(date)} className={`relative flex min-h-11 flex-col items-center justify-center rounded-lg px-0.5 py-1 text-sm tabular-nums transition-colors focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-30 ${colour} ${date === day ? 'ring-2 ring-brand ring-offset-2 ring-offset-surface' : 'enabled:hover:ring-1 enabled:hover:ring-brand/50'}`}>
                <span className={isToday ? 'font-bold underline decoration-2 underline-offset-4' : 'font-medium'}>{Number(date.slice(-2))}</span>{count > 0 && <span aria-hidden className="mt-0.5 text-xs leading-3">{count}×</span>}
              </button>
            })}
          </div>
        </section>)}</div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5 text-xs text-muted"><div className="flex flex-wrap items-center gap-3" aria-label="Activity colour legend">{[['bg-surface-muted', 'None'], ['bg-mint-muted', '1'], ['bg-mint', '2–3'], ['bg-mint-deep', '4+']].map(([colour, label]) => <span key={label} className="inline-flex items-center gap-1.5"><span aria-hidden className={`h-3 w-3 rounded-sm ${colour}`} />{label}</span>)}<span>practices per day</span></div><span>Dates in Sydney time · Monday–Sunday</span></div>
        <div className="mt-5 border-t border-border pt-5" aria-live="polite" aria-atomic="true"><h3 className="text-sm font-semibold">{dateLabel(day, { weekday: 'long', day: 'numeric', month: 'long' })} <span className="font-normal text-muted">· {selected.length} {selected.length === 1 ? 'practice' : 'practices'}</span></h3>{selected.length ? <p className="mt-2 text-sm leading-6 text-muted">{summariseThemes(selected).filter(theme => theme.count > 0).map(theme => `${theme.theme} ${theme.count}`).join(' · ')}. {selected.filter(log => log.source === 'rehearsal').length} rehearsals, {selected.filter(log => log.source === 'recording').length} recorded responses.</p> : <p className="mt-2 text-sm leading-6 text-muted">{shownLogs.length ? 'No completed practice on this day. Choose a shaded day to explore it.' : 'Complete a rehearsal or save a mock response to begin filling your calendar.'}</p>}</div>
      </>}
    </section>
    <div className="mt-7 grid items-start gap-7 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <section className="min-w-0 rounded-3xl border border-border bg-surface p-5 sm:p-8" aria-labelledby="weekly-themes-title">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="weekly-themes-title" className="font-display text-2xl font-semibold tracking-tight">Weekly theme summary</h2><div className="flex gap-2"><button type="button" className={control} onClick={() => setWeek(shiftDay(week, -7))} disabled={!data.available || week <= range.from} aria-label="Previous practice week"><Chevron direction="left" /></button><button type="button" className={control} onClick={() => setWeek(shiftDay(week, 7))} disabled={!data.available || shiftDay(week, 7) >= range.until || shiftDay(week, 7) > data.today} aria-label="Next practice week"><Chevron direction="right" /></button></div></div>
        <p className="mt-2 text-sm text-muted" aria-live="polite">{dateLabel(week, { day: 'numeric', month: 'short' })} – {dateLabel(shiftDay(week, 6), { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        {data.available ? <><p className="mt-4 text-sm leading-6"><strong className="tabular-nums">{weekLogs.length}</strong> {weekLogs.length === 1 ? 'practice' : 'practices'} across <strong>{activeDays}</strong> {activeDays === 1 ? 'day' : 'days'}<span className="text-muted"> · {average === null ? 'No self-ratings yet' : `${average.toFixed(1)}/5 average self-rating`}</span></p>
          <table className="mt-5 w-full text-left text-sm"><caption className="sr-only">Practice counts and average student self-ratings by main question theme for the selected week</caption><thead><tr className="border-b border-border text-xs text-muted"><th scope="col" className="pb-3 font-medium">Question theme</th><th scope="col" className="pb-3 text-right font-medium">Practised</th><th scope="col" className="pb-3 pl-3 text-right font-medium">Self-rating</th></tr></thead><tbody>{themes.map(theme => <tr key={theme.theme} className="border-b border-border/60 last:border-0"><th scope="row" className="py-3 pr-2 font-medium">{theme.theme}</th><td className="py-3 text-right tabular-nums">{theme.count}</td><td className="py-3 pl-3 text-right"><span className="tabular-nums">{theme.average === null ? '—' : `${theme.average.toFixed(1)}/5`}</span><span className="mt-0.5 block text-[11px] text-muted">{theme.rated ? `${theme.rated} rated` : theme.count ? 'Not rated' : 'No practice'}</span></td></tr>)}</tbody></table>
          <p className="mt-4 text-xs leading-5 text-muted">Each MMI station or panel response counts once, under its main theme. Averages use only your rated responses. Tutor marks are separate.</p>
        </> : <p className="mt-5 text-sm text-muted">Weekly counts and ratings will appear when your history is available.</p>}
      </section>
      {notes}
    </div>
  </>
}

function Chevron({ direction }: { direction: 'left' | 'right' }) { return <svg aria-hidden="true" width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={direction === 'left' ? 'm12 5-5 5 5 5' : 'm8 5 5 5-5 5'} /></svg> }
