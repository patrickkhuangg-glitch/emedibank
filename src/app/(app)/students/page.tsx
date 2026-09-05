import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Container } from '@/components/container'
import { requireStaff } from '@/lib/auth/dal'
import { createAdminClient } from '@/lib/supabase/admin'
import type { TutoringSession } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'My students · Studocyte' }

export default async function TutorStudentsPage() {
  const tutor = await requireStaff('/students')
  if (tutor.role === 'admin') redirect('/admin/students')

  const admin = createAdminClient()
  const { data } = await admin.from('tutoring_sessions').select('*').eq('tutor_id', tutor.id).order('scheduled_for')
  const sessions = data ?? []
  const studentIds = [...new Set(sessions.map((session) => session.student_id))]
  const { data: profiles } = studentIds.length
    ? await admin.from('profiles').select('id,full_name').in('id', studentIds)
    : { data: [] as { id: string; full_name: string | null }[] }
  const nameById = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name || 'Student']))
  const grouped = new Map<string, TutoringSession[]>()
  for (const session of sessions) grouped.set(session.student_id, [...(grouped.get(session.student_id) ?? []), session])
  const students = [...grouped.entries()].map(([id, studentSessions]) => ({
    id,
    name: nameById.get(id) || studentSessions[0]?.student_email || 'Student',
    email: studentSessions[0]?.student_email || '',
    sessions: studentSessions,
  })).sort((a, b) => a.name.localeCompare(b.name))

  return (
    <Container className="py-10 sm:py-14">
      <main className="mx-auto max-w-6xl">
        <header className="grid gap-6 border-b border-border pb-8 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-brand">Tutor workspace</p>
            <h1 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">My students</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted">Students assigned to your lessons, with their upcoming booking and tutoring history.</p>
          </div>
          <div className="flex items-baseline gap-2 rounded-2xl bg-brand-muted px-5 py-3 text-brand"><span className="font-mono text-2xl font-semibold tabular-nums">{students.length}</span><span className="text-xs font-semibold">assigned</span></div>
        </header>

        {students.length === 0 ? (
          <section className="mt-8 rounded-3xl border border-dashed border-border bg-surface px-6 py-14 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-muted text-brand"><StudentsIcon /></span>
            <h2 className="mt-5 font-display text-2xl font-bold tracking-tight">No students assigned yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">When an admin assigns you to a tutoring booking, the student and their lesson history will appear here.</p>
            <Link href="/bookings" className="eb-press mt-6 inline-flex rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white">View bookings</Link>
          </section>
        ) : (
          <section className="mt-8 grid gap-4 md:grid-cols-2">
            {students.map((student) => <StudentCard key={student.id} {...student} />)}
          </section>
        )}
      </main>
    </Container>
  )
}

function StudentCard({ name, email, sessions }: { name: string; email: string; sessions: TutoringSession[] }) {
  const upcoming = sessions.find((session) => session.status === 'scheduled')
  const completed = sessions.filter((session) => session.status === 'completed').length
  return (
    <article className="flex min-h-64 flex-col rounded-3xl border border-border bg-surface p-6 sm:p-7">
      <div className="flex items-start justify-between gap-4"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-muted font-display text-lg font-bold text-brand">{initials(name)}</span><span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-muted">{sessions.length} lesson{sessions.length === 1 ? '' : 's'}</span></div>
      <h2 className="mt-6 font-display text-2xl font-bold tracking-tight">{name}</h2>
      <p className="mt-1 text-sm text-muted">{email}</p>
      <div className="mt-6 border-t border-border pt-5"><p className="font-mono text-xs font-semibold uppercase tracking-[0.15em] text-muted">Next lesson</p><p className="mt-2 text-sm font-semibold">{upcoming ? formatDate(upcoming.scheduled_for) : 'Nothing booked'}</p><p className="mt-1 text-xs text-muted">{completed} completed</p></div>
      <Link href="/bookings" className="mt-auto pt-6 text-sm font-semibold text-brand">Open lesson history <span aria-hidden>→</span></Link>
    </article>
  )
}

function initials(value: string) { return value.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'S' }
function formatDate(value: string) { return new Intl.DateTimeFormat('en-AU', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Australia/Brisbane' }).format(new Date(value)) }
function StudentsIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M16 11a3 3 0 0 0 0-6M17 15a5 5 0 0 1 4 5"/></svg> }
