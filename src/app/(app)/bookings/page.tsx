import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/container'
import { CancelTutoringSessionButton } from '@/components/cancel-tutoring-session-button'
import { getProfile, requireUser } from '@/lib/auth/dal'
import { googleCalendarUrl } from '@/lib/calendar'
import { SITE_URL } from '@/lib/site'
import { createAdminClient } from '@/lib/supabase/admin'
import type { StudyPlanItem, TutoringSession } from '@/lib/supabase/types'
import { updateTutoringSessionFollowUpAction } from '@/lib/tutoring/actions'
import { isZoomConfigured } from '@/lib/zoom/client'
import { BookingForm, type BookingPlanOption } from './booking-form'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Bookings · Studocyte' }

export default async function BookingsPage() {
  const user = await requireUser('/bookings')
  const profile = await getProfile()
  const admin = createAdminClient()
  const adminView = profile?.role === 'admin'

  const { data: sessions } = adminView
    ? await admin.from('tutoring_sessions').select('*').order('scheduled_for')
    : await admin.from('tutoring_sessions').select('*').eq('student_id', user.id).order('scheduled_for')
  const sessionList = sessions ?? []

  let bookingPlans: BookingPlanOption[] = []
  let studentNames = new Map<string, string>()
  if (adminView) {
    const [{ data: plans }, { data: items }, { data: profiles }] = await Promise.all([
      admin.from('study_plans').select('id,user_id,name,status').eq('status', 'active').order('updated_at', { ascending: false }),
      admin.from('study_plan_items').select('*').eq('kind', 'tutoring').eq('unit_label', 'hours').order('created_at'),
      admin.from('profiles').select('id,full_name'),
    ])
    studentNames = new Map((profiles ?? []).map((student) => [student.id, student.full_name || 'Student']))
    const userIds = (plans ?? []).map((plan) => plan.user_id)
    const { data: users } = userIds.length
      ? await Promise.all(userIds.map((id) => admin.auth.admin.getUserById(id))).then((results) => ({ data: results.map((result) => result.data.user) }))
      : { data: [] }
    const emailByUser = new Map((users ?? []).filter(Boolean).map((student) => [student!.id, student!.email ?? '']))
    const itemsByPlan = new Map<string, StudyPlanItem[]>()
    for (const item of items ?? []) itemsByPlan.set(item.plan_id, [...(itemsByPlan.get(item.plan_id) ?? []), item])
    bookingPlans = (plans ?? []).map((plan) => ({
      id: plan.id,
      name: plan.name,
      studentName: studentNames.get(plan.user_id) || emailByUser.get(plan.user_id) || 'Student',
      studentEmail: emailByUser.get(plan.user_id) || '',
      inclusions: (itemsByPlan.get(plan.id) ?? [])
        .map((item) => ({ id: item.id, title: item.title, remainingHours: Math.max(0, item.total_units - item.used_units) }))
        .filter((item) => item.remainingHours > 0),
    })).filter((plan) => plan.inclusions.length > 0)
    // Keep labels available for sessions belonging to non-active packages too.
    for (const session of sessionList) if (!studentNames.has(session.student_id)) studentNames.set(session.student_id, session.student_email)
  }

  const upcoming = sessionList.filter((session) => session.status === 'scheduled')
  const past = sessionList.filter((session) => !upcoming.includes(session))

  return <Container className="py-10 sm:py-14"><main className="mx-auto max-w-6xl">
    <header className="flex flex-col gap-5 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
      <div><h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Bookings</h1><p className="mt-3 max-w-2xl text-base leading-7 text-muted">{adminView ? 'Schedule tutoring, keep the Zoom details together and leave a clear follow-up after each lesson.' : 'Your upcoming tutoring, Zoom links and the follow-up from each lesson.'}</p></div>
      <Link href={adminView ? '/admin' : '/study-plan'} className="eb-press inline-flex h-10 items-center justify-center rounded-full border border-border bg-surface px-4 text-sm font-semibold transition-colors hover:border-brand/30 hover:bg-brand-muted">{adminView ? 'Admin home' : 'Study Plan'}</Link>
    </header>

    {adminView ? <section className="mt-8 rounded-3xl bg-ink p-6 text-white sm:p-8"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-mint">Tutor workspace</p><h2 className="mt-3 font-display text-2xl font-bold tracking-tight">Book a lesson</h2><p className="mt-2 max-w-xl text-sm leading-6 text-white/70">Select a student package and its remaining tutoring hours. A Zoom link is created automatically for both of you.</p></div>{!isZoomConfigured() ? <Link href="/admin/zoom" className="eb-press inline-flex w-fit rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink">Connect Zoom first</Link> : null}</div>{isZoomConfigured() ? <BookingForm plans={bookingPlans} /> : null}</section> : null}

    <SessionGroup title="Upcoming" empty={adminView ? 'No tutoring lessons are booked yet.' : 'No lessons are booked yet. Your tutor will add your next session here.'} sessions={upcoming} adminView={adminView} studentNames={studentNames} />
    <SessionGroup title="Past lessons" empty="There are no completed lessons to review yet." sessions={past} adminView={adminView} studentNames={studentNames} />
  </main></Container>
}

function SessionGroup({ title, empty, sessions, adminView, studentNames }: { title: string; empty: string; sessions: TutoringSession[]; adminView: boolean; studentNames: Map<string, string> }) {
  return <section className="mt-10"><div className="flex items-center justify-between gap-4"><h2 className="font-display text-2xl font-bold tracking-tight">{title}</h2><span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-muted">{sessions.length}</span></div>{sessions.length === 0 ? <div className="mt-4 rounded-3xl border border-dashed border-border bg-surface px-6 py-10 text-sm text-muted">{empty}</div> : <div className="mt-4 grid gap-4">{sessions.map((session) => <SessionCard key={session.id} session={session} adminView={adminView} studentName={studentNames.get(session.student_id)} />)}</div>}</section>
}

function SessionCard({ session, adminView, studentName }: { session: TutoringSession; adminView: boolean; studentName?: string }) {
  const date = new Intl.DateTimeFormat('en-AU', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', timeZone: 'Australia/Brisbane' }).format(new Date(session.scheduled_for))
  const launchUrl = `${SITE_URL}/api/zoom/sessions/${session.id}/start`
  const addToGoogleCalendar = googleCalendarUrl({ id: session.id, title: session.title, scheduledFor: session.scheduled_for, bookedMinutes: session.booked_minutes, launchUrl })
  const studentCopy = !adminView && (session.tutor_notes || session.homework)
  return <article className="overflow-hidden rounded-3xl border border-border bg-surface"><div className="flex flex-col gap-5 p-6 sm:p-7 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Status status={session.status}/>{adminView && studentName ? <span className="rounded-full bg-brand-muted px-2.5 py-1 text-xs font-semibold text-brand">{studentName}</span> : null}</div><h3 className="mt-4 font-display text-2xl font-bold tracking-tight">{session.title}</h3><p className="mt-2 text-sm leading-6 text-muted">{date} <span className="px-1 text-border">·</span> {formatMinutes(session.booked_minutes)}</p>{adminView ? <p className="mt-2 text-sm text-muted">{session.student_email}</p> : null}</div><div className="flex flex-wrap items-center gap-2">{session.status === 'scheduled' ? <>{adminView ? <><a href={launchUrl} className="eb-press rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">Start Zoom</a><a href={addToGoogleCalendar} target="_blank" rel="noreferrer" className="eb-press rounded-full border border-border px-4 py-2 text-sm font-semibold hover:border-brand/30 hover:bg-brand-muted">Google Calendar</a><a href={`/api/calendar/tutoring-sessions/${session.id}`} className="eb-press rounded-full border border-border px-4 py-2 text-sm font-semibold hover:border-brand/30 hover:bg-brand-muted">.ics</a></> : <a href={session.zoom_join_url} target="_blank" rel="noreferrer" className="eb-press rounded-full bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground">Join Zoom</a>}<CancelTutoringSessionButton sessionId={session.id}/></> : null}</div></div>{studentCopy ? <div className="grid gap-px border-t border-border bg-border sm:grid-cols-2">{session.tutor_notes ? <FollowUpBlock title="Tutor notes" text={session.tutor_notes} /> : <div className="bg-surface p-6" />}{session.homework ? <FollowUpBlock title="Next work" text={session.homework} /> : <div className="bg-surface p-6" />}</div> : null}{adminView ? <form action={updateTutoringSessionFollowUpAction} className="border-t border-border bg-surface-muted/45 p-6 sm:p-7"><input type="hidden" name="sessionId" value={session.id}/><input type="hidden" name="planId" value={session.plan_id}/><div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between"><div><h4 className="font-semibold">Lesson follow-up</h4><p className="mt-1 text-sm text-muted">These notes and next steps are shown to the student in Bookings.</p></div><button type="submit" className="eb-press w-fit rounded-full bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground">Save follow-up</button></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold">Tutor notes<textarea name="tutorNotes" defaultValue={session.tutor_notes ?? ''} placeholder="What went well, what to improve…" className="field mt-2 min-h-28 resize-y" /></label><label className="block text-sm font-semibold">Homework / next work<textarea name="homework" defaultValue={session.homework ?? ''} placeholder="Tasks to complete before the next lesson…" className="field mt-2 min-h-28 resize-y" /></label></div></form> : null}</article>
}

function FollowUpBlock({ title, text }: { title: string; text: string }) { return <div className="bg-surface p-6"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{title}</p><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">{text}</p></div> }
function Status({ status }: { status: TutoringSession['status'] }) { const label = status === 'needs_review' ? 'review needed' : status; const tone = status === 'completed' ? 'bg-success-muted text-success' : status === 'needs_review' ? 'bg-brand-muted text-brand' : status === 'cancelled' ? 'bg-surface-muted text-muted' : 'bg-mint-muted text-mint-deep'; return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{label}</span> }
function formatMinutes(minutes: number) { return minutes % 60 === 0 ? `${minutes / 60} hour${minutes === 60 ? '' : 's'}` : `${Math.floor(minutes / 60) ? `${Math.floor(minutes / 60)} h ` : ''}${minutes % 60} min` }
