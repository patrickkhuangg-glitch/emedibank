import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/container'
import { StudyPlanChecklist, StudyPlanExamDates, type StudyPlanExamOption } from '@/components/study-plan-controls'
import { requireUser } from '@/lib/auth/dal'
import { createAdminClient } from '@/lib/supabase/admin'
import type { StudyPlan, StudyPlanExamDate, StudyPlanItem, StudyPlanTask, TutoringSession } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Study Plan' }

export default async function StudyPlanPage() {
  const user = await requireUser('/study-plan')
  const admin = createAdminClient()
  const now = new Date()
  const nowIso = now.toISOString()

  const [{ data: plans }, { data: entitlements }, { data: examDates }, { data: tasks }, { data: sessions }] = await Promise.all([
    admin.from('study_plans').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }),
    admin.from('entitlements').select('exam_id').eq('user_id', user.id).or(`expires_at.is.null,expires_at.gt.${nowIso}`),
    admin.from('study_plan_exam_dates').select('*').eq('user_id', user.id).order('exam_date'),
    admin.from('study_plan_tasks').select('*').eq('user_id', user.id).order('is_completed').order('created_at', { ascending: false }),
    admin.from('tutoring_sessions').select('*').eq('student_id', user.id).eq('status', 'scheduled').gte('scheduled_for', nowIso).order('scheduled_for'),
  ])

  const planList = plans ?? []
  const planIds = planList.map((plan) => plan.id)
  const { data: items } = planIds.length
    ? await admin.from('study_plan_items').select('*').in('plan_id', planIds).order('created_at')
    : { data: [] as StudyPlanItem[] }
  const examIds = [...new Set((entitlements ?? []).map((entitlement) => entitlement.exam_id))]
  const { data: exams } = examIds.length
    ? await admin.from('exams').select('id,name,slug,kind').in('id', examIds).eq('active', true)
    : { data: [] as StudyPlanExamOption[] }

  const activeExams = sortExams((exams ?? []) as StudyPlanExamOption[])
  const activeExamIds = new Set(activeExams.map((exam) => exam.id))
  const dates = ((examDates ?? []) as StudyPlanExamDate[]).filter((date) => activeExamIds.has(date.exam_id))
  const upcomingSessions = (sessions ?? []) as TutoringSession[]
  const checklist = (tasks ?? []) as StudyPlanTask[]
  const itemsByPlan = groupItems(items ?? [])
  const examById = new Map(activeExams.map((exam) => [exam.id, exam]))
  const timeline = buildTimeline(dates, upcomingSessions, examById, now)
  const nextExam = dates
    .map((date) => ({ date, exam: examById.get(date.exam_id) }))
    .filter((entry): entry is { date: StudyPlanExamDate; exam: StudyPlanExamOption } => Boolean(entry.exam) && daysFromToday(entry.date.exam_date, now) >= 0)
    .sort((a, b) => a.date.exam_date.localeCompare(b.date.exam_date))[0]

  return <Container className="py-10 sm:py-14">
    <main className="mx-auto max-w-7xl">
      <header className="flex flex-col gap-6 border-b border-border pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div><h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Study Plan</h1><p className="mt-3 max-w-2xl text-base leading-7 text-muted">Every exam date, lesson, package and next step in one place.</p></div>
        <div className="flex flex-wrap items-center gap-2" aria-label="Unlocked exams">{activeExams.length ? activeExams.map((exam) => <span key={exam.id} className="rounded-full bg-brand-muted px-3 py-1.5 text-xs font-semibold text-brand">{exam.name}</span>) : <span className="rounded-full bg-surface-muted px-3 py-1.5 text-xs font-semibold text-muted">No full exams unlocked</span>}<Link href="/bookings" className="eb-press inline-flex h-9 items-center rounded-full border border-border bg-surface px-4 text-xs font-semibold transition-colors hover:border-brand/30 hover:bg-brand-muted">Open bookings</Link></div>
      </header>

      <Timeline events={timeline} hasDates={dates.length > 0} />

      <div className="mt-6 grid gap-6 lg:grid-cols-12 lg:items-start">
        <div className="space-y-6 lg:col-span-8">
          <section id="exam-dates"><StudyPlanExamDates exams={activeExams} dates={dates} /></section>
          <UpcomingLessons sessions={upcomingSessions} nextExam={nextExam} now={now} />
          <StudyPlanChecklist exams={activeExams} tasks={checklist} />
        </div>
        <PackageDetails plans={planList} itemsByPlan={itemsByPlan} />
      </div>
    </main>
  </Container>
}

type TimelineEvent = {
  id: string
  kind: 'exam' | 'lesson'
  title: string
  detail: string
  date: string
}

function Timeline({ events, hasDates }: { events: TimelineEvent[]; hasDates: boolean }) {
  return <section className="mt-8 overflow-hidden rounded-3xl bg-ink text-white eb-soft">
    <header className="flex flex-col gap-4 border-b border-white/10 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8"><div><h2 className="font-display text-2xl font-semibold tracking-tight">Your preparation timeline</h2><p className="mt-1 text-sm text-white/65">The next lessons and exam days across your account.</p></div><a href="#exam-dates" className="eb-press inline-flex w-fit rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink">{hasDates ? 'Manage exam dates' : 'Set exam dates'}</a></header>
    {events.length ? <><div className="snap-x snap-mandatory overflow-x-auto px-6 py-8 sm:px-8"><ol className="relative grid min-w-[720px] gap-5" style={{ gridTemplateColumns: `repeat(${events.length + 1}, minmax(9rem, 1fr))` }}><li aria-hidden className="absolute left-3 right-3 top-[0.43rem] h-px bg-white/18"><span className="eb-bar block h-px bg-mint" /></li><li className="relative snap-start"><span className="block h-3.5 w-3.5 rounded-full border-[3px] border-ink bg-mint ring-1 ring-mint" /><p className="mt-5 font-display text-lg font-semibold">Today</p><p className="mt-1 font-mono text-xs text-white/55">{formatShortDate(new Date().toISOString())}</p></li>{events.map((event) => <li key={event.id} className="relative snap-start"><span className={`block h-3.5 w-3.5 rounded-full border-[3px] border-ink ring-1 ${event.kind === 'exam' ? 'bg-white ring-white' : 'bg-mint ring-mint'}`} /><p className="mt-5 line-clamp-2 min-h-11 font-display text-lg font-semibold leading-snug">{event.title}</p><p className="mt-1 text-xs text-white/60">{event.detail}</p><p className="mt-2 font-mono text-xs text-white/45">{formatShortDate(event.date)}</p></li>)}</ol></div><p className="flex items-center gap-2 border-t border-white/10 px-6 py-3 text-xs text-white/60 sm:hidden">Swipe to see later dates <ArrowRight /></p></> : <div className="px-6 py-10 sm:px-8"><p className="max-w-xl font-display text-2xl font-semibold tracking-tight">Start by adding an exam date.</p><p className="mt-2 max-w-xl text-sm leading-6 text-white/65">Your plan will then arrange each lesson and milestone in the order it is coming up.</p></div>}
  </section>
}

function UpcomingLessons({ sessions, nextExam, now }: { sessions: TutoringSession[]; nextExam?: { date: StudyPlanExamDate; exam: StudyPlanExamOption }; now: Date }) {
  return <section className="overflow-hidden rounded-3xl border border-border bg-surface eb-soft"><div className="grid lg:grid-cols-[minmax(0,1fr)_15rem]">
    <div className="p-6 sm:p-7"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-2xl font-semibold tracking-tight">Future lessons</h2><Link href="/bookings" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:text-foreground">View all <ArrowRight /></Link></div>{sessions.length ? <ol className="mt-5 divide-y divide-border">{sessions.slice(0, 3).map((session) => <li key={session.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{session.title}</p><p className="mt-1 text-sm text-muted">{formatLessonDate(session.scheduled_for)} <span className="px-1 text-border">·</span> {formatMinutes(session.booked_minutes)}</p></div><a href={session.zoom_join_url} target="_blank" rel="noreferrer" className="eb-press inline-flex w-fit rounded-full border border-border px-3.5 py-2 text-xs font-semibold transition-colors hover:border-brand/30 hover:bg-brand-muted">Join Zoom</a></li>)}</ol> : <div className="mt-6 rounded-2xl bg-surface-muted/55 px-5 py-6"><p className="text-sm font-semibold">No lessons booked yet.</p><p className="mt-1 text-sm leading-6 text-muted">Future tutoring sessions will appear here automatically.</p></div>}</div>
    <aside className="flex min-h-52 flex-col justify-between border-t border-border bg-brand-muted/65 p-6 lg:border-l lg:border-t-0"><div><p className="text-sm font-semibold text-brand">Next exam</p>{nextExam ? <><p className="mt-5 font-mono text-5xl font-semibold tabular-nums text-foreground">{daysFromToday(nextExam.date.exam_date, now)}</p><p className="mt-2 text-sm text-muted">days until {nextExam.date.label === 'Exam day' ? nextExam.exam.name : nextExam.date.label}</p></> : <><p className="mt-5 font-display text-2xl font-semibold tracking-tight">No date set</p><p className="mt-2 text-sm leading-6 text-muted">Add a date above to start the countdown.</p></>} </div>{nextExam ? <p className="mt-5 font-mono text-xs tabular-nums text-brand">{formatLongDate(nextExam.date.exam_date)}</p> : <a href="#exam-dates" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand"><ArrowUp /> Set a date</a>}</aside>
  </div></section>
}

function PackageDetails({ plans, itemsByPlan }: { plans: StudyPlan[]; itemsByPlan: Map<string, StudyPlanItem[]> }) {
  const activePlans = plans.filter((plan) => plan.status === 'active')
  return <aside className="overflow-hidden rounded-3xl border border-border bg-surface eb-soft lg:sticky lg:top-24 lg:col-span-4"><header className="border-b border-border px-6 py-5"><div className="flex items-center justify-between gap-3"><h2 className="font-display text-2xl font-semibold tracking-tight">Package details</h2><span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-muted">{activePlans.length} active</span></div><p className="mt-2 text-sm leading-6 text-muted">Everything included across your current tutoring packages.</p></header>{activePlans.length ? <div className="divide-y divide-border">{activePlans.map((plan) => <Package key={plan.id} plan={plan} items={itemsByPlan.get(plan.id) ?? []} />)}</div> : <div className="px-6 py-8"><p className="text-sm font-semibold">No active tutoring package.</p><p className="mt-2 text-sm leading-6 text-muted">Your exam dates and checklist still work without one.</p></div>}</aside>
}

function Package({ plan, items }: { plan: StudyPlan; items: StudyPlanItem[] }) {
  const percent = progressPercent(items)
  return <section className="px-6 py-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-display text-lg font-semibold tracking-tight">{plan.name}</h3>{plan.starts_on || plan.ends_on ? <p className="mt-1 text-xs text-muted">{dateRange(plan.starts_on, plan.ends_on)}</p> : null}</div><span className="rounded-full bg-mint-muted px-2.5 py-1 text-[11px] font-semibold text-mint-deep">Active</span></div>{items.length ? <><div className="mt-5 h-1.5 overflow-hidden rounded-full bg-surface-muted"><span className="eb-bar block h-full rounded-full bg-mint" style={{ width: `${percent}%` }} /></div><p className="mt-2 font-mono text-[11px] tabular-nums text-muted">{percent}% used</p><ul className="mt-5 space-y-4">{items.map((item) => { const remaining = Math.max(0, item.total_units - item.used_units); return <li key={item.id} className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold">{item.title}</p>{item.exam_scope ? <p className="mt-0.5 text-xs text-muted">{item.exam_scope}</p> : null}</div><p className="shrink-0 font-mono text-xs font-semibold tabular-nums text-foreground">{formatUnit(remaining)} {shortUnit(item.unit_label)}</p></li>})}</ul></> : <p className="mt-5 text-sm leading-6 text-muted">Your tutor is adding the inclusions for this package.</p>}</section>
}

function buildTimeline(dates: StudyPlanExamDate[], sessions: TutoringSession[], examById: Map<string, StudyPlanExamOption>, now: Date): TimelineEvent[] {
  const examEvents = dates.filter((date) => daysFromToday(date.exam_date, now) >= 0).map((date) => ({ id: `exam-${date.id}`, kind: 'exam' as const, title: date.label === 'Exam day' ? examById.get(date.exam_id)?.name ?? 'Exam' : date.label, detail: 'Exam day', date: `${date.exam_date}T12:00:00` }))
  const lessonEvents = sessions.map((session) => ({ id: `lesson-${session.id}`, kind: 'lesson' as const, title: session.title, detail: 'Tutoring lesson', date: session.scheduled_for }))
  return [...examEvents, ...lessonEvents].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 6)
}

function groupItems(items: StudyPlanItem[]) { const grouped = new Map<string, StudyPlanItem[]>(); for (const item of items) grouped.set(item.plan_id, [...(grouped.get(item.plan_id) ?? []), item]); return grouped }
function sortExams(exams: StudyPlanExamOption[]) { const order = new Map([['gamsat', 0], ['ucat', 1], ['isat', 2], ['interviews', 3]]); return [...exams].sort((a, b) => (order.get(a.slug) ?? 99) - (order.get(b.slug) ?? 99)) }
function daysFromToday(date: string, now: Date) { const [targetYear, targetMonth, targetDay] = date.split('-').map(Number); const today = sydneyDateParts(now); return Math.round((Date.UTC(targetYear, targetMonth - 1, targetDay) - Date.UTC(today.year, today.month - 1, today.day)) / 86_400_000) }
function sydneyDateParts(date: Date) { const parts = new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Sydney', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(date); const number = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value); return { year: number('year'), month: number('month'), day: number('day') } }
function formatShortDate(value: string) { return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', timeZone: 'Australia/Sydney' }).format(new Date(value)) }
function formatLongDate(value: string) { return new Intl.DateTimeFormat('en-AU', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Australia/Sydney' }).format(new Date(`${value}T12:00:00+10:00`)) }
function formatLessonDate(value: string) { return new Intl.DateTimeFormat('en-AU', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Australia/Brisbane' }).format(new Date(value)) }
function formatMinutes(minutes: number) { return minutes % 60 === 0 ? `${minutes / 60} hour${minutes === 60 ? '' : 's'}` : `${Math.floor(minutes / 60) ? `${Math.floor(minutes / 60)} h ` : ''}${minutes % 60} min` }
function formatUnit(value: number) { return Number.isInteger(value) ? String(value) : value.toFixed(1) }
function shortUnit(label: StudyPlanItem['unit_label']) { return label === 'hours' ? 'hrs left' : `${label} left` }
function progressPercent(items: StudyPlanItem[]) { return items.length ? Math.min(100, Math.round(items.reduce((sum, item) => sum + (item.used_units / item.total_units) * 100, 0) / items.length)) : 0 }
function dateRange(start: string | null, end: string | null) { const format = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }); return start && end ? `${format(start)} — ${format(end)}` : start ? `Started ${format(start)}` : `Ends ${format(end!)}` }
function ArrowRight() { return <svg aria-hidden width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10h12M12 6l4 4-4 4" /></svg> }
function ArrowUp() { return <svg aria-hidden width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 16V4M6 8l4-4 4 4" /></svg> }
