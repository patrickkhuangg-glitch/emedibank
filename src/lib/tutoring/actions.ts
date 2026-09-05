'use server'

import { revalidatePath } from 'next/cache'
import { getProfile, requireAdmin, requireUser } from '@/lib/auth/dal'
import { createAdminClient } from '@/lib/supabase/admin'
import { createHostCalendarEvent, deleteHostCalendarEvent } from '@/lib/google-calendar'
import { createZoomMeeting, deleteZoomMeeting } from '@/lib/zoom/client'

export type CreateTutoringSessionState = { error?: string; message?: string }

export async function createTutoringSessionAction(
  _previous: CreateTutoringSessionState,
  formData: FormData,
): Promise<CreateTutoringSessionState> {
  const adminProfile = await getProfile()
  if (adminProfile?.role !== 'admin') return { error: 'Only admins can schedule tutoring sessions.' }

  const planId = value(formData, 'planId')
  const planItemId = value(formData, 'planItemId')
  const title = value(formData, 'title')
  const scheduledFor = value(formData, 'scheduledFor')
  const bookedMinutes = Number(value(formData, 'bookedMinutes'))
  if (!planId || !planItemId || !title || !scheduledFor || !Number.isInteger(bookedMinutes) || bookedMinutes < 15 || bookedMinutes > 480 || bookedMinutes % 15 !== 0) {
    return { error: 'Add a title, date, time and a 15-minute booking length.' }
  }

  const startsAt = parseBrisbaneDateTime(scheduledFor)
  if (Number.isNaN(startsAt.getTime()) || startsAt.getTime() < Date.now() - 60_000) return { error: 'Choose a future session time.' }

  const admin = createAdminClient()
  const [{ data: plan }, { data: item }] = await Promise.all([
    admin.from('study_plans').select('id,user_id,status').eq('id', planId).maybeSingle(),
    admin.from('study_plan_items').select('*').eq('id', planItemId).eq('plan_id', planId).maybeSingle(),
  ])
  if (!plan || plan.status !== 'active') return { error: 'This package is no longer active.' }
  if (!item || item.kind !== 'tutoring' || item.unit_label !== 'hours') return { error: 'Choose an hours-based tutoring inclusion.' }
  if (item.total_units - item.used_units < bookedMinutes / 60) return { error: 'There are not enough tutoring hours remaining for this booking.' }

  const [{ data: userResult }, { data: studentProfile }] = await Promise.all([
    admin.auth.admin.getUserById(plan.user_id),
    admin.from('profiles').select('full_name').eq('id', plan.user_id).maybeSingle(),
  ])
  const email = userResult.user?.email
  if (!email) return { error: 'This student account does not have an email address.' }
  const lessonTitle = formatLessonTitle({
    studentName: studentProfile?.full_name || nameFromEmail(email),
    tutorName: adminProfile.full_name || 'Tutor',
    subject: title,
  })

  try {
    const meeting = await createZoomMeeting({
      topic: lessonTitle,
      scheduledFor: startsAt.toISOString(),
      durationMinutes: bookedMinutes,
    })
    const { data: session, error } = await admin.from('tutoring_sessions').insert({
      plan_id: planId,
      plan_item_id: item.id,
      student_id: plan.user_id,
      student_email: email.toLowerCase(),
      title: lessonTitle,
      scheduled_for: startsAt.toISOString(),
      booked_minutes: bookedMinutes,
      zoom_meeting_id: String(meeting.id),
      zoom_meeting_uuid: meeting.uuid ?? null,
      zoom_join_url: meeting.join_url,
      zoom_start_url: meeting.start_url,
      created_by: adminProfile.id,
    }).select('id').single()
    if (error) return { error: 'Zoom created the meeting, but Studocyte could not save it. Please do not schedule a duplicate yet; refresh and check the session list.' }
    let calendarMessage = ''
    try {
      const calendar = await createHostCalendarEvent({
        hostUserId: adminProfile.id,
        title: lessonTitle,
        scheduledFor: startsAt.toISOString(),
        durationMinutes: bookedMinutes,
        zoomStartUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://studocyte.emeducate.com.au'}/api/zoom/sessions/${session.id}/start`,
      })
      if (calendar.status === 'added') {
        await admin.from('tutoring_sessions').update({ google_calendar_event_id: calendar.eventId }).eq('id', session.id)
        calendarMessage = ' It was also added to your Google Calendar.'
      }
      if (calendar.status === 'not_connected') calendarMessage = ' Connect Google Calendar in Zoom settings to add future lessons automatically.'
    } catch (calendarError) {
      console.error('Could not add tutoring session to host calendar.', calendarError)
      calendarMessage = ' Google Calendar could not be updated; the Zoom lesson is still booked.'
    }
    refresh(planId)
    return { message: `Zoom session scheduled.${calendarMessage}` }
  } catch (error) {
    console.error('Could not create Zoom tutoring meeting.', error)
    return { error: error instanceof Error ? error.message : 'Zoom could not create this meeting.' }
  }
}

export async function cancelTutoringSessionAction(formData: FormData) {
  const user = await requireUser('/bookings')
  const profile = await getProfile()
  const sessionId = value(formData, 'sessionId')
  if (!sessionId) return

  const admin = createAdminClient()
  const { data: session } = await admin
    .from('tutoring_sessions')
    .select('id,plan_id,student_id,created_by,status,scheduled_for,zoom_meeting_id,google_calendar_event_id')
    .eq('id', sessionId)
    .maybeSingle()

  if (!session || (profile?.role !== 'admin' && session.student_id !== user.id)) return
  if (session.status !== 'scheduled' && session.status !== 'cancelled') return
  if (profile?.role !== 'admin' && session.status === 'scheduled' && new Date(session.scheduled_for).getTime() <= Date.now()) return

  if (session.status !== 'cancelled') {
    const { error } = await admin
      .from('tutoring_sessions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.id)
      .eq('status', 'scheduled')
    if (error) throw error
  }

  const cleanup = await Promise.allSettled([
    deleteZoomMeeting(session.zoom_meeting_id),
    session.created_by
      ? deleteHostCalendarEvent({ hostUserId: session.created_by, eventId: session.google_calendar_event_id })
      : Promise.resolve({ status: 'not_available' as const }),
  ])
  for (const result of cleanup) if (result.status === 'rejected') console.error('Could not fully remove a cancelled lesson from an external calendar or meeting provider.', result.reason)

  refresh(session.plan_id)
}

export async function confirmBookedTutoringSessionAction(formData: FormData) {
  await requireAdmin()
  const sessionId = value(formData, 'sessionId')
  const planId = value(formData, 'planId')
  if (!sessionId || !planId) return
  const admin = createAdminClient()
  const { error } = await admin.rpc('complete_tutoring_session', {
    p_session_id: sessionId,
    p_actual_minutes: Number(value(formData, 'actualMinutes')) || 0,
    p_student_attended: true,
  })
  if (error) throw error
  refresh(planId)
}

export async function approveTutoringOverrunAction(formData: FormData) {
  await requireAdmin()
  const sessionId = value(formData, 'sessionId')
  const planId = value(formData, 'planId')
  if (!sessionId || !planId) return
  const { error } = await createAdminClient().rpc('approve_tutoring_overrun', { p_session_id: sessionId })
  if (error) throw error
  refresh(planId)
}

export async function updateTutoringSessionFollowUpAction(formData: FormData) {
  await requireAdmin()
  const sessionId = value(formData, 'sessionId')
  const planId = value(formData, 'planId')
  if (!sessionId || !planId) return

  const { error } = await createAdminClient()
    .from('tutoring_sessions')
    .update({
      tutor_notes: value(formData, 'tutorNotes') || null,
      homework: value(formData, 'homework') || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .eq('plan_id', planId)

  if (error) throw error
  refresh(planId)
}

function refresh(planId: string) {
  revalidatePath('/admin')
  revalidatePath('/admin/study-plans')
  revalidatePath(`/admin/study-plans/${planId}`)
  revalidatePath('/study-plan')
  revalidatePath('/bookings')
}

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

// `datetime-local` intentionally has no timezone. Tutoring is booked in the
// Australian product timezone so a Vercel server running in UTC cannot shift
// the booked start by ten hours.
function parseBrisbaneDateTime(dateTime: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dateTime)) return new Date('invalid')
  return new Date(`${dateTime}:00+10:00`)
}

function formatLessonTitle({ studentName, tutorName, subject }: { studentName: string; tutorName: string; subject: string }) {
  return `${studentName.trim()}/${tutorName.trim()} - ${subject.trim()} Private Tutoring`.slice(0, 160)
}

function nameFromEmail(email: string) {
  return email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}
