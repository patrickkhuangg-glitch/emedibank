import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/container'
import { requireUser } from '@/lib/auth/dal'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { StudyPlanItem, StudyPlan } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Study Plan' }

export default async function StudyPlanPage() {
  const user = await requireUser('/study-plan')
  const supabase = await createClient()
  const { data: plans } = await supabase.from('study_plans').select('*').eq('user_id', user.id).order('updated_at', { ascending: false })
  const planList = plans ?? []
  const planIds = planList.map((plan) => plan.id)
  const { data: items } = planIds.length
    ? await supabase.from('study_plan_items').select('*').in('plan_id', planIds).order('created_at')
    : { data: [] as StudyPlanItem[] }
  const { data: sessions } = planIds.length
    ? await createAdminClient().from('tutoring_sessions').select('id,plan_id,title,scheduled_for,booked_minutes,zoom_join_url,status').eq('student_id', user.id).in('plan_id', planIds).order('scheduled_for')
    : { data: [] as StudentTutoringSession[] }
  const itemsByPlan = new Map<string, StudyPlanItem[]>()
  for (const item of items ?? []) itemsByPlan.set(item.plan_id, [...(itemsByPlan.get(item.plan_id) ?? []), item])
  const sessionsByPlan = new Map<string, StudentTutoringSession[]>()
  for (const session of sessions ?? []) sessionsByPlan.set(session.plan_id, [...(sessionsByPlan.get(session.plan_id) ?? []), session])

  return (
    <Container className="py-10 sm:py-14">
      <main className="mx-auto max-w-5xl">
        <header className="flex flex-col gap-5 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Study Plan</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted">Your tutoring inclusions, remaining time and upcoming preparation at a glance.</p>
          </div>
          <Link href="/dashboard" className="eb-press inline-flex h-10 items-center justify-center rounded-full border border-border bg-surface px-4 text-sm font-semibold transition-colors hover:border-brand/30 hover:bg-brand-muted">Open dashboard</Link>
        </header>

        {planList.length === 0 ? <EmptyPlan /> : <div className="mt-8 space-y-5">{planList.map((plan, index) => <PlanCard key={plan.id} plan={plan} items={itemsByPlan.get(plan.id) ?? []} sessions={sessionsByPlan.get(plan.id) ?? []} index={index} />)}</div>}
      </main>
    </Container>
  )
}

type StudentTutoringSession = {
  id: string
  plan_id: string
  title: string
  scheduled_for: string
  booked_minutes: number
  zoom_join_url: string
  status: 'scheduled' | 'completed' | 'needs_review' | 'cancelled'
}

function PlanCard({ plan, items, sessions, index }: { plan: StudyPlan; items: StudyPlanItem[]; sessions: StudentTutoringSession[]; index: number }) {
  const active = plan.status === 'active'
  return <section className={`eb-rise overflow-hidden rounded-3xl ${active ? 'bg-ink text-white' : 'border border-border bg-surface text-foreground'}`} style={{ animationDelay: `${index * 75}ms` }}>
    <div className="grid lg:grid-cols-[minmax(0,1fr)_17rem]">
      <div className="p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{plan.name}</h2>{plan.starts_on || plan.ends_on ? <p className={`mt-2 text-sm ${active ? 'text-white/70' : 'text-muted'}`}>{dateRange(plan.starts_on, plan.ends_on)}</p> : null}</div>
          <StatusPill status={plan.status} inverse={active} />
        </div>
        {items.length === 0 ? <p className={`mt-8 text-sm ${active ? 'text-white/70' : 'text-muted'}`}>Your tutor is setting up the inclusions for this package.</p> : <div className="mt-8 divide-y divide-white/12">{items.map((item) => <Inclusion key={item.id} item={item} active={active} />)}</div>}
        {sessions.length ? <div className="mt-8 border-t border-white/12 pt-6"><p className="text-sm font-semibold">Your Zoom sessions</p><div className="mt-3 divide-y divide-white/12">{sessions.map((session) => <StudentSession key={session.id} session={session}/>)}</div></div> : null}
      </div>
      <aside className={`p-6 sm:p-8 lg:border-l ${active ? 'border-white/12 bg-white/[0.05]' : 'border-border bg-surface-muted/45'}`}>
        <p className={`text-sm font-semibold ${active ? 'text-white' : 'text-foreground'}`}>Package progress</p>
        <p className={`mt-3 text-sm leading-6 ${active ? 'text-white/70' : 'text-muted'}`}>{progressSummary(items)}</p>
        <div className={`mt-5 h-2 overflow-hidden rounded-full ${active ? 'bg-white/15' : 'bg-surface-muted'}`}><div className="h-full rounded-full bg-mint" style={{ width: `${progressPercent(items)}%` }} /></div>
        <p className={`mt-3 text-xs ${active ? 'text-white/65' : 'text-muted'}`}>{active ? 'Your tutor updates this after each session.' : statusDescription(plan.status)}</p>
      </aside>
    </div>
  </section>
}
function StudentSession({ session }: { session: StudentTutoringSession }) {
  const date = new Intl.DateTimeFormat('en-AU', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(session.scheduled_for))
  const canJoin = session.status === 'scheduled'
  return <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{session.title}</p><p className="mt-1 text-sm text-white/65">{date} <span className="px-1 text-white/25">·</span> {formatMinutes(session.booked_minutes)}</p></div>{canJoin ? <a href={session.zoom_join_url} target="_blank" rel="noreferrer" className="eb-press inline-flex w-fit rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink transition-transform hover:-translate-y-0.5">Join Zoom</a> : <span className="text-sm text-white/60">{session.status === 'completed' ? 'Completed' : 'Awaiting tutor review'}</span>}</div>
}

function Inclusion({ item, active }: { item: StudyPlanItem; active: boolean }) {
  const remaining = Math.max(0, item.total_units - item.used_units)
  const completed = item.used_units >= item.total_units
  return <div className="flex flex-col gap-3 py-5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex min-w-0 items-start gap-3"><span className={`grid h-10 w-10 flex-none place-items-center rounded-2xl ${active ? 'bg-white/10 text-mint' : 'bg-brand-muted text-brand'}`}><ItemIcon kind={item.kind}/></span><div><p className="font-semibold">{item.title}</p>{item.exam_scope ? <p className={`mt-0.5 text-sm ${active ? 'text-white/65' : 'text-muted'}`}>{item.exam_scope}</p> : null}</div></div>
    <div className="sm:text-right"><p className={`font-mono text-sm font-semibold tabular-nums ${active ? 'text-white' : 'text-foreground'}`}>{inclusionLabel(item, remaining)}</p><p className={`mt-1 text-xs ${active ? 'text-white/65' : 'text-muted'}`}>{completed ? 'Completed' : `${formatUnit(item.used_units)} used`}</p></div>
  </div>
}

function EmptyPlan() {
  return <section className="mt-8 grid min-h-80 place-items-center rounded-3xl border border-dashed border-border bg-surface px-6 py-12 text-center"><div className="max-w-md"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-muted text-brand"><PlanIcon /></span><h2 className="mt-5 font-display text-2xl font-bold tracking-tight">Your plan will appear here.</h2><p className="mt-3 text-sm leading-6 text-muted">When your tutor adds your package, you&rsquo;ll be able to see every inclusion and how much time remains.</p></div></section>
}

function StatusPill({ status, inverse }: { status: StudyPlan['status']; inverse: boolean }) {
  const labels = { active: 'Active', paused: 'Paused', completed: 'Completed' }
  const tone = status === 'active' ? (inverse ? 'bg-mint-muted text-mint-deep' : 'bg-success-muted text-success') : inverse ? 'bg-white/10 text-white/75' : 'bg-surface-muted text-muted'
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{labels[status]}</span>
}

function inclusionLabel(item: StudyPlanItem, remaining: number) {
  if (item.unit_label === 'places' && item.total_units === 1) return remaining > 0 ? '1 place reserved' : '1 place completed'
  return `${formatUnit(remaining)} of ${formatUnit(item.total_units)} ${item.unit_label} remaining`
}
function formatUnit(value: number) { return Number.isInteger(value) ? String(value) : value.toFixed(1) }
function formatMinutes(minutes: number) { return minutes % 60 === 0 ? `${minutes / 60} hour${minutes === 60 ? '' : 's'}` : `${Math.floor(minutes / 60) ? `${Math.floor(minutes / 60)} h ` : ''}${minutes % 60} min` }
function progressPercent(items: StudyPlanItem[]) {
  if (items.length === 0) return 0
  const total = items.reduce((sum, item) => sum + item.total_units, 0)
  const used = items.reduce((sum, item) => sum + item.used_units, 0)
  return total === 0 ? 0 : Math.round((used / total) * 100)
}
function progressSummary(items: StudyPlanItem[]) {
  if (items.length === 0) return 'Your inclusions will appear here once they are confirmed.'
  const complete = items.filter((item) => item.used_units >= item.total_units).length
  return complete === 0 ? `${items.length} inclusion${items.length === 1 ? '' : 's'} ready to use.` : `${complete} of ${items.length} inclusions completed.`
}
function statusDescription(status: StudyPlan['status']) { return status === 'paused' ? 'This package is currently paused.' : 'This package has been completed.' }
function dateRange(start: string | null, end: string | null) { const format = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }); return start && end ? `${format(start)} — ${format(end)}` : start ? `Started ${format(start)}` : `Ends ${format(end!)}` }

function PlanIcon() { return <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="m8 9 1.5 1.5L12 8M14 10h2M8 15l1.5 1.5L12 14M14 16h2"/></svg> }
function ItemIcon({ kind }: { kind: StudyPlanItem['kind'] }) { return kind === 'tutoring' ? <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 5h16v11H8l-4 4V5Z"/><path d="M8 9h8M8 12h5"/></svg> : kind === 'masterclass' ? <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 19V5l8-3 8 3v14l-8 3-8-3Z"/><path d="M8 10h8M8 14h5"/></svg> : <PlanIcon /> }
