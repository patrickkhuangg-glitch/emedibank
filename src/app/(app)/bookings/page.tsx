import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/container'
import { getProfile, requireUser } from '@/lib/auth/dal'
import { SITE_URL } from '@/lib/site'
import { createAdminClient } from '@/lib/supabase/admin'
import type { StudyPlanItem } from '@/lib/supabase/types'
import { isZoomConfigured } from '@/lib/zoom/client'
import { BookingForm, type BookingPlanOption, type BookingTutorOption } from './booking-form'
import { BookingSessionList, type BookingSessionRow } from './booking-session-list'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Bookings · Studocyte' }

export default async function BookingsPage() {
  const user = await requireUser('/bookings')
  const profile = await getProfile()
  const admin = createAdminClient()
  const adminView = profile?.role === 'admin'
  const tutorView = profile?.role === 'tutor'
  const staffView = adminView || tutorView
  const zoomConfigured = isZoomConfigured()

  const { data: sessions, error: sessionsError } = adminView
    ? await admin.from('tutoring_sessions').select('*').order('scheduled_for')
    : tutorView
      ? await admin.from('tutoring_sessions').select('*').eq('tutor_id', user.id).order('scheduled_for')
      : await admin.from('tutoring_sessions').select('*').eq('student_id', user.id).order('scheduled_for')
  const sessionList = sessions ?? []

  let bookingPlans: BookingPlanOption[] = []
  let bookingTutors: BookingTutorOption[] = []
  let studentNames = new Map<string, string>()
  if (staffView) {
    const studentIds = [...new Set(sessionList.map((session) => session.student_id))]
    const { data: assignedStudents } = studentIds.length
      ? await admin.from('profiles').select('id,full_name').in('id', studentIds)
      : { data: [] as { id: string; full_name: string | null }[] }
    studentNames = new Map((assignedStudents ?? []).map((student) => [student.id, student.full_name || 'Student']))
  }
  if (adminView) {
    const [{ data: plans }, { data: items }, { data: profiles }, { data: staff }] = await Promise.all([
      admin.from('study_plans').select('id,user_id,name,status').eq('status', 'active').order('updated_at', { ascending: false }),
      admin.from('study_plan_items').select('*').eq('kind', 'tutoring').eq('unit_label', 'hours').order('created_at'),
      admin.from('profiles').select('id,full_name'),
      admin.from('profiles').select('id,full_name,role').in('role', ['tutor', 'admin']),
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
    bookingTutors = (staff ?? []).map((tutor) => ({ id: tutor.id, name: tutor.full_name || (tutor.id === user.id ? 'You' : 'Tutor'), role: tutor.role as 'tutor' | 'admin' }))
    // Keep labels available for sessions belonging to non-active packages too.
    for (const session of sessionList) if (!studentNames.has(session.student_id)) studentNames.set(session.student_id, session.student_email)
  }

  const sessionRows: BookingSessionRow[] = sessionList.map((session) => ({
    id: session.id,
    planId: session.plan_id,
    studentEmail: session.student_email,
    studentName: studentNames.get(session.student_id) || session.student_email,
    title: session.title,
    scheduledFor: session.scheduled_for,
    bookedMinutes: session.booked_minutes,
    zoomJoinUrl: session.zoom_join_url,
    tutorNotes: session.tutor_notes,
    homework: session.homework,
    status: session.status,
  }))

  return <Container className="py-10 sm:py-14"><main className="mx-auto max-w-6xl">
    <header className="flex flex-col gap-5 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
      <div><h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Bookings</h1><p className="mt-3 max-w-2xl text-base leading-7 text-muted">{adminView ? 'Schedule tutoring, assign the right tutor and keep every follow-up together.' : tutorView ? 'Your assigned lessons, student details and follow-up notes in one place.' : 'Your upcoming tutoring, Zoom links and the follow-up from each lesson.'}</p></div>
      <Link href={adminView ? '/admin' : tutorView ? '/students' : '/study-plan'} className="eb-press inline-flex h-10 items-center justify-center rounded-full border border-border bg-surface px-4 text-sm font-semibold transition-colors hover:border-brand/30 hover:bg-brand-muted">{adminView ? 'Admin home' : tutorView ? 'My students' : 'Study Plan'}</Link>
    </header>

    {adminView ? zoomConfigured ? <details className="group mt-8 overflow-hidden rounded-2xl bg-ink text-white"><summary className="flex cursor-pointer list-none items-center justify-between gap-5 px-5 py-4 transition-colors hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand [&::-webkit-details-marker]:hidden sm:px-6"><div><h2 className="font-display text-xl font-semibold tracking-tight">Book a lesson</h2><p className="mt-1 text-sm text-white/65">Student, tutor, time and package hours.</p></div><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-ink transition-transform duration-200 group-open:rotate-180"><ChevronDown /></span></summary><div className="border-t border-white/10 px-5 pb-6 sm:px-6"><BookingForm plans={bookingPlans} tutors={bookingTutors} /></div></details> : <section className="mt-8 flex flex-col gap-4 rounded-2xl bg-ink px-5 py-4 text-white sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><h2 className="font-display text-xl font-semibold tracking-tight">Connect Zoom to book lessons</h2><p className="mt-1 text-sm text-white/65">Zoom is required before the scheduler can create a lesson.</p></div><Link href="/admin/zoom" className="eb-press inline-flex w-fit shrink-0 rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink">Connect Zoom</Link></section> : null}

    {sessionsError ? <section className="mt-8 rounded-2xl border border-border bg-surface px-6 py-10 text-center eb-soft"><h2 className="font-display text-xl font-semibold tracking-tight">Lessons couldn&apos;t load</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">The bookings list is temporarily unavailable. Your lessons have not been changed.</p><Link href="/bookings" className="eb-press mt-5 inline-flex rounded-full bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground">Try again</Link></section> : <BookingSessionList sessions={sessionRows} staffView={staffView} siteUrl={SITE_URL} />}
  </main></Container>
}

function ChevronDown() { return <svg aria-hidden width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m6 8 4 4 4-4"/></svg> }
