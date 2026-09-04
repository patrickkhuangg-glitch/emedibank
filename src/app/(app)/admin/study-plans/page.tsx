import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/container'
import { requireAdmin } from '@/lib/auth/dal'
import { createAdminClient } from '@/lib/supabase/admin'
import type { StudyPlan, StudyPlanItem } from '@/lib/supabase/types'
import { CreateStudyPlanForm } from './create-study-plan-form'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Admin · Study plans' }

export default async function AdminStudyPlansPage() {
  await requireAdmin()
  const admin = createAdminClient()
  const { data: plans } = await admin.from('study_plans').select('*').order('updated_at', { ascending: false })
  const planList = plans ?? []
  const userIds = [...new Set(planList.map((plan) => plan.user_id))]
  const [{ data: items }, { data: profiles }, usersResult] = await Promise.all([
    planList.length ? admin.from('study_plan_items').select('*').in('plan_id', planList.map((plan) => plan.id)).order('created_at') : Promise.resolve({ data: [] as StudyPlanItem[] }),
    userIds.length ? admin.from('profiles').select('id,full_name').in('id', userIds) : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ])
  const emailById = new Map((usersResult.data?.users ?? []).map((user) => [user.id, user.email ?? 'No email']))
  const nameById = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]))
  const itemsByPlan = new Map<string, StudyPlanItem[]>()
  for (const item of items ?? []) itemsByPlan.set(item.plan_id, [...(itemsByPlan.get(item.plan_id) ?? []), item])

  return <Container className="py-10 sm:py-14"><main className="mx-auto max-w-6xl">
    <Link href="/admin" className="text-sm font-medium text-muted transition-colors hover:text-foreground">← Admin dashboard</Link>
    <header className="mt-5 grid gap-6 border-b border-border pb-8 lg:grid-cols-[1fr_auto] lg:items-end"><div><h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Student study plans</h1><p className="mt-3 max-w-2xl text-base leading-7 text-muted">Create tutoring packages, set their inclusions and keep remaining time accurate after every session.</p></div><span className="rounded-2xl bg-brand-muted px-5 py-3 font-mono text-2xl font-semibold tabular-nums text-brand">{planList.length}</span></header>

    <section className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="overflow-hidden rounded-3xl border border-border bg-surface"><div className="border-b border-border px-6 py-5"><h2 className="font-display text-2xl font-bold tracking-tight">Packages</h2></div>{planList.length === 0 ? <div className="px-6 py-12 text-center"><p className="font-semibold">No student packages yet.</p><p className="mt-2 text-sm text-muted">Create the first one with the form alongside.</p></div> : <div className="divide-y divide-border">{planList.map((plan) => <PlanRow key={plan.id} plan={plan} studentName={nameById.get(plan.user_id)} email={emailById.get(plan.user_id) ?? 'No email'} items={itemsByPlan.get(plan.id) ?? []} />)}</div>}</div>
      <section className="h-fit rounded-3xl bg-ink p-6 text-white"><h2 className="font-display text-2xl font-bold tracking-tight">Create a package</h2><p className="mt-2 text-sm leading-6 text-white/70">Start with the student&rsquo;s existing Studocyte account. You can add tutoring hours and other inclusions next.</p><CreateStudyPlanForm /></section>
    </section>
  </main></Container>
}

function PlanRow({ plan, studentName, email, items }: { plan: StudyPlan; studentName: string | null | undefined; email: string; items: StudyPlanItem[] }) {
  const total = items.reduce((sum, item) => sum + item.total_units, 0)
  const used = items.reduce((sum, item) => sum + item.used_units, 0)
  return <Link href={`/admin/study-plans/${plan.id}`} className="group flex flex-col gap-4 px-6 py-5 transition-colors hover:bg-surface-muted/55 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{studentName || email}</p><Status status={plan.status}/></div><p className="mt-1 text-sm text-muted">{plan.name} <span className="px-1 text-border">·</span> {email}</p></div><div className="flex items-center gap-4 sm:text-right"><p className="font-mono text-xs text-muted tabular-nums">{items.length ? `${formatUnit(used)} / ${formatUnit(total)} used` : 'No inclusions'}</p><span className="text-brand transition-transform group-hover:translate-x-1" aria-hidden>→</span></div></Link>
}
function Status({ status }: { status: StudyPlan['status'] }) { const tone = status === 'active' ? 'bg-success-muted text-success' : 'bg-surface-muted text-muted'; return <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone}`}>{status}</span> }
function formatUnit(value: number) { return Number.isInteger(value) ? String(value) : value.toFixed(1) }
