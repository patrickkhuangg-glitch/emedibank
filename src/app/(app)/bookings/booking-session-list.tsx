'use client'

import { useMemo, useState } from 'react'
import { CancelTutoringSessionButton } from '@/components/cancel-tutoring-session-button'
import { googleCalendarUrl } from '@/lib/calendar'
import type { TutoringSessionStatus } from '@/lib/supabase/types'
import { updateTutoringSessionFollowUpAction } from '@/lib/tutoring/actions'

export type BookingSessionRow = {
  id: string
  planId: string
  studentEmail: string
  studentName: string
  title: string
  scheduledFor: string
  bookedMinutes: number
  zoomJoinUrl: string
  tutorNotes: string | null
  homework: string | null
  status: TutoringSessionStatus
}

type View = 'upcoming' | 'past'
type PastStatus = 'all' | Exclude<TutoringSessionStatus, 'scheduled'>

export function BookingSessionList({ sessions, staffView, siteUrl }: { sessions: BookingSessionRow[]; staffView: boolean; siteUrl: string }) {
  const [view, setView] = useState<View>('upcoming')
  const [query, setQuery] = useState('')
  const [pastStatus, setPastStatus] = useState<PastStatus>('all')
  const [page, setPage] = useState(1)
  const pageSize = staffView ? 20 : 10
  const upcomingCount = sessions.filter((session) => session.status === 'scheduled').length
  const pastCount = sessions.length - upcomingCount

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('en-AU')
    return sessions
      .filter((session) => view === 'upcoming' ? session.status === 'scheduled' : session.status !== 'scheduled')
      .filter((session) => view === 'upcoming' || pastStatus === 'all' || session.status === pastStatus)
      .filter((session) => !normalized || [session.title, session.studentName, session.studentEmail].some((value) => value.toLocaleLowerCase('en-AU').includes(normalized)))
      .sort((a, b) => view === 'upcoming'
        ? new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()
        : new Date(b.scheduledFor).getTime() - new Date(a.scheduledFor).getTime())
  }, [pastStatus, query, sessions, view])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const from = filtered.length ? (currentPage - 1) * pageSize + 1 : 0
  const to = Math.min(currentPage * pageSize, filtered.length)
  const hasActiveFilter = Boolean(query.trim()) || (view === 'past' && pastStatus !== 'all')

  function chooseView(next: View) { setView(next); setPage(1) }

  return <section className="mt-8 overflow-hidden rounded-2xl border border-border bg-surface eb-soft">
    <header className="flex flex-col gap-4 border-b border-border px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="inline-flex w-fit rounded-full bg-surface-muted p-1" aria-label="Lesson period">
        <ViewButton active={view === 'upcoming'} onClick={() => chooseView('upcoming')}>Upcoming <Count value={upcomingCount} active={view === 'upcoming'} /></ViewButton>
        <ViewButton active={view === 'past'} onClick={() => chooseView('past')}>Past <Count value={pastCount} active={view === 'past'} /></ViewButton>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {view === 'past' ? <label className="sr-only" htmlFor="booking-status">Filter past lessons by status</label> : null}
        {view === 'past' ? <select id="booking-status" value={pastStatus} onChange={(event) => { setPastStatus(event.target.value as PastStatus); setPage(1) }} className="field min-h-10 bg-surface py-2 text-sm sm:w-40 sm:shrink-0"><option value="all">All statuses</option><option value="completed">Completed</option><option value="needs_review">Needs review</option><option value="cancelled">Cancelled</option></select> : null}
        <label className="relative block sm:w-72 sm:shrink-0"><span className="sr-only">Search lessons</span><span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-muted"><SearchIcon /></span><input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} placeholder={staffView ? 'Search student or lesson…' : 'Search lessons…'} className="field min-h-10 w-full bg-surface py-2 pl-9 text-sm" /></label>
      </div>
    </header>

    {visible.length ? <>
      <div className={`hidden border-b border-border bg-surface-muted/45 px-5 py-2.5 text-xs font-semibold text-muted md:grid md:items-center md:gap-4 ${staffView ? 'md:grid-cols-[9rem_minmax(12rem,1.4fr)_minmax(9rem,1fr)_5rem_6.5rem_1.5rem]' : 'md:grid-cols-[9rem_minmax(14rem,1fr)_5rem_6.5rem_1.5rem]'}`} aria-hidden>
        <span>Date</span><span>Lesson</span>{staffView ? <span>Student</span> : null}<span>Length</span><span>Status</span><span />
      </div>
      <div className="divide-y divide-border">{visible.map((session) => <SessionRow key={session.id} session={session} staffView={staffView} siteUrl={siteUrl} />)}</div>
      <footer className="flex items-center justify-between gap-4 border-t border-border bg-surface-muted/30 px-4 py-3 sm:px-5"><p className="font-mono text-xs tabular-nums text-muted">{from}–{to} of {filtered.length}</p><div className="flex items-center gap-2"><PageButton disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} label="Previous page"><ArrowLeft /></PageButton><span className="min-w-14 text-center font-mono text-xs tabular-nums text-muted">{currentPage}/{totalPages}</span><PageButton disabled={currentPage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} label="Next page"><ArrowRight /></PageButton></div></footer>
    </> : <div className="px-5 py-12 text-center"><p className="font-display text-xl font-semibold tracking-tight">{hasActiveFilter ? 'No matching lessons' : view === 'upcoming' ? 'No upcoming lessons' : 'No past lessons'}</p><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">{hasActiveFilter ? 'Try a different search or status.' : view === 'upcoming' ? 'New bookings will appear here as soon as they are scheduled.' : 'Completed and cancelled lessons will appear here.'}</p></div>}
  </section>
}

function SessionRow({ session, staffView, siteUrl }: { session: BookingSessionRow; staffView: boolean; siteUrl: string }) {
  const launchUrl = `${siteUrl}/api/zoom/sessions/${session.id}/start`
  const addToGoogleCalendar = googleCalendarUrl({ id: session.id, title: session.title, scheduledFor: session.scheduledFor, bookedMinutes: session.bookedMinutes, launchUrl })
  const hasStudentFollowUp = !staffView && (session.tutorNotes || session.homework)
  const lesson = lessonSummary(session.title)

  return <details className="group">
    <summary className={`grid cursor-pointer list-none grid-cols-[5.25rem_minmax(0,1fr)_auto_1.5rem] items-center gap-x-3 gap-y-1 px-4 py-3.5 transition-colors hover:bg-brand-muted/35 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand [&::-webkit-details-marker]:hidden sm:px-5 md:gap-x-4 md:py-3 ${staffView ? 'md:grid-cols-[9rem_minmax(12rem,1.4fr)_minmax(9rem,1fr)_5rem_6.5rem_1.5rem]' : 'md:grid-cols-[9rem_minmax(14rem,1fr)_5rem_6.5rem_1.5rem]'}`}>
      <div className="col-span-1"><p className="font-mono text-sm font-semibold tabular-nums text-foreground">{formatCompactDate(session.scheduledFor)}</p><p className="mt-0.5 font-mono text-xs tabular-nums text-muted">{formatTime(session.scheduledFor)}</p></div>
      <div className="col-start-2 row-start-1 min-w-0 md:col-start-auto md:row-start-auto"><p className="truncate text-sm font-semibold text-foreground">{lesson.subject}</p><p className="mt-0.5 truncate text-xs text-muted">{lesson.tutor ? `Tutor: ${lesson.tutor} · ${formatMinutes(session.bookedMinutes)}` : formatMinutes(session.bookedMinutes)}</p></div>
      {staffView ? <div className="col-start-2 row-start-2 min-w-0 md:col-start-auto md:row-start-auto"><p className="truncate text-sm text-foreground">{session.studentName}</p></div> : null}
      <p className="hidden font-mono text-xs tabular-nums text-muted md:block">{formatMinutes(session.bookedMinutes)}</p>
      <Status status={session.status} />
      <span className="col-start-4 row-start-1 grid h-7 w-7 place-items-center justify-self-end rounded-full text-muted transition-transform duration-200 group-open:rotate-180 md:col-start-auto md:row-start-auto"><ChevronDown /></span>
    </summary>
    <div className="border-t border-border bg-surface-muted/35 px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div><p className="text-sm font-semibold">{formatLongDate(session.scheduledFor)} · {formatMinutes(session.bookedMinutes)}</p>{staffView ? <p className="mt-1 text-xs text-muted">{session.studentName} · {session.studentEmail}</p> : null}</div>
        {session.status === 'scheduled' ? <div className="flex flex-wrap items-center gap-2">{staffView ? <><ActionLink href={launchUrl} primary>Start Zoom</ActionLink><ActionLink href={addToGoogleCalendar} external>Google Calendar</ActionLink><ActionLink href={`/api/calendar/tutoring-sessions/${session.id}`}>.ics</ActionLink></> : <ActionLink href={session.zoomJoinUrl} external primary>Join Zoom</ActionLink>}<CancelTutoringSessionButton sessionId={session.id} /></div> : null}
      </div>
      {hasStudentFollowUp ? <div className="mt-4 grid gap-px overflow-hidden rounded-xl bg-border sm:grid-cols-2">{session.tutorNotes ? <FollowUpBlock title="Tutor notes" text={session.tutorNotes} /> : <div className="bg-surface p-4" />}{session.homework ? <FollowUpBlock title="Next work" text={session.homework} /> : <div className="bg-surface p-4" />}</div> : null}
      {!staffView && session.status !== 'scheduled' && !hasStudentFollowUp ? <p className="mt-4 text-sm text-muted">No follow-up has been added for this lesson.</p> : null}
      {staffView ? <form action={updateTutoringSessionFollowUpAction} className="mt-4 border-t border-border pt-4"><input type="hidden" name="sessionId" value={session.id}/><input type="hidden" name="planId" value={session.planId}/><div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-semibold">Tutor notes<textarea name="tutorNotes" defaultValue={session.tutorNotes ?? ''} placeholder="What went well, what to improve…" className="field mt-2 min-h-20 resize-y bg-surface" /></label><label className="block text-sm font-semibold">Homework / next work<textarea name="homework" defaultValue={session.homework ?? ''} placeholder="Tasks before the next lesson…" className="field mt-2 min-h-20 resize-y bg-surface" /></label></div><button type="submit" className="eb-press mt-3 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground">Save follow-up</button></form> : null}
    </div>
  </details>
}

function ViewButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button type="button" aria-pressed={active} onClick={onClick} className={`eb-press inline-flex min-h-9 items-center gap-2 rounded-full px-3.5 text-sm font-semibold transition-colors ${active ? 'bg-ink text-white eb-soft' : 'text-muted hover:text-foreground'}`}>{children}</button> }
function Count({ value, active }: { value: number; active: boolean }) { return <span className={`rounded-full px-1.5 py-0.5 font-mono text-xs tabular-nums ${active ? 'bg-white/15 text-white' : 'bg-surface text-muted'}`}>{value}</span> }
function PageButton({ disabled, onClick, label, children }: { disabled: boolean; onClick: () => void; label: string; children: React.ReactNode }) { return <button type="button" disabled={disabled} onClick={onClick} aria-label={label} className="eb-press grid h-8 w-8 place-items-center rounded-full border border-border bg-surface text-foreground transition-colors hover:border-brand/30 hover:bg-brand-muted disabled:cursor-not-allowed disabled:opacity-35">{children}</button> }
function ActionLink({ href, external = false, primary = false, children }: { href: string; external?: boolean; primary?: boolean; children: React.ReactNode }) { return <a href={href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined} className={`eb-press rounded-full px-4 py-2 text-sm font-semibold transition-colors ${primary ? 'bg-ink text-white' : 'border border-border bg-surface hover:border-brand/30 hover:bg-brand-muted'}`}>{children}</a> }
function FollowUpBlock({ title, text }: { title: string; text: string }) { return <div className="bg-surface p-4"><p className="text-xs font-semibold text-muted">{title}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">{text}</p></div> }
function Status({ status }: { status: TutoringSessionStatus }) { const label = status === 'needs_review' ? 'Needs review' : status.charAt(0).toUpperCase() + status.slice(1); const tone = status === 'completed' ? 'bg-success-muted text-success' : status === 'needs_review' ? 'bg-brand-muted text-brand' : status === 'cancelled' ? 'bg-surface-muted text-muted' : 'bg-mint-muted text-mint-deep'; return <span className={`col-start-3 row-start-1 w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold md:col-start-auto md:row-start-auto ${tone}`}>{label}</span> }
function formatCompactDate(value: string) { return new Intl.DateTimeFormat('en-AU', { day: '2-digit', month: 'short', timeZone: 'Australia/Brisbane' }).format(new Date(value)) }
function formatTime(value: string) { return new Intl.DateTimeFormat('en-AU', { hour: 'numeric', minute: '2-digit', timeZone: 'Australia/Brisbane' }).format(new Date(value)) }
function formatLongDate(value: string) { return new Intl.DateTimeFormat('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Australia/Brisbane' }).format(new Date(value)) }
function formatMinutes(minutes: number) { return minutes % 60 === 0 ? `${minutes / 60} h` : `${Math.floor(minutes / 60) ? `${Math.floor(minutes / 60)} h ` : ''}${minutes % 60} min` }
function lessonSummary(title: string) { const match = title.match(/^[^/]+\/(.+?) - (.+?) Private Tutoring$/); return match ? { tutor: match[1].trim(), subject: match[2].trim() } : { tutor: '', subject: title } }
function SearchIcon() { return <svg aria-hidden width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="8.5" cy="8.5" r="5"/><path d="m12.5 12.5 4 4"/></svg> }
function ChevronDown() { return <svg aria-hidden width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m6 8 4 4 4-4"/></svg> }
function ArrowLeft() { return <svg aria-hidden width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 10H4m4-4-4 4 4 4"/></svg> }
function ArrowRight() { return <svg aria-hidden width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10h12m-4-4 4 4-4 4"/></svg> }
