import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Container } from '@/components/container'
import { requireAdmin } from '@/lib/auth/dal'
import { createAdminClient } from '@/lib/supabase/admin'
import { addStudyPlanItemAction, archiveStudyPlanAction, deleteStudyPlanItemAction, updateStudyPlanAction, updateStudyPlanItemAction } from '@/lib/study-plans/actions'
import type { StudyPlanItem } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Admin · Study package' }

export default async function StudyPlanDetailPage({ params }: { params: Promise<{ planId: string }> }) {
  await requireAdmin()
  const { planId } = await params
  const admin = createAdminClient()
  const [{ data: plan }, { data: items }] = await Promise.all([
    admin.from('study_plans').select('*').eq('id', planId).maybeSingle(),
    admin.from('study_plan_items').select('*').eq('plan_id', planId).order('created_at'),
  ])
  if (!plan) notFound()
  const [{ data: profile }, userResult] = await Promise.all([
    admin.from('profiles').select('full_name').eq('id', plan.user_id).maybeSingle(),
    admin.auth.admin.getUserById(plan.user_id),
  ])
  const studentName = profile?.full_name || userResult.data.user?.email || 'Student'
  const email = userResult.data.user?.email ?? ''

  return <Container className="py-10 sm:py-14"><main className="mx-auto max-w-5xl">
    <Link href="/admin/study-plans" className="text-sm font-medium text-muted transition-colors hover:text-foreground">← Student study plans</Link>
    <header className="mt-5 flex flex-col gap-5 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">{studentName}</h1><p className="mt-2 text-muted">{email}</p></div><Link href="/study-plan" className="eb-press inline-flex h-10 items-center justify-center rounded-full border border-border bg-surface px-4 text-sm font-semibold transition-colors hover:border-brand/30 hover:bg-brand-muted">Student view</Link></header>
    <section className="mt-8 rounded-3xl border border-border bg-surface p-6 sm:p-8"><h2 className="font-display text-2xl font-bold tracking-tight">Package details</h2><form action={updateStudyPlanAction} className="mt-6 grid gap-4 sm:grid-cols-2"><input type="hidden" name="planId" value={plan.id}/><Label label="Package name" className="sm:col-span-2"><input required name="name" defaultValue={plan.name} className="field"/></Label><Label label="Status"><select name="status" defaultValue={plan.status} className="field"><option value="active">Active</option><option value="paused">Paused</option><option value="completed">Completed</option></select></Label><div className="hidden sm:block"/><Label label="Start date"><input type="date" name="startsOn" defaultValue={plan.starts_on ?? ''} className="field"/></Label><Label label="End date"><input type="date" name="endsOn" defaultValue={plan.ends_on ?? ''} className="field"/></Label><div className="sm:col-span-2"><button type="submit" className="eb-press rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition-transform hover:-translate-y-0.5">Save package details</button></div></form></section>

    <section className="mt-5 overflow-hidden rounded-3xl border border-border bg-surface"><header className="flex flex-col gap-3 border-b border-border px-6 py-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-display text-2xl font-bold tracking-tight">Inclusions</h2><p className="mt-1 text-sm text-muted">Update the used amount after each tutoring session or event.</p></div><span className="rounded-full bg-brand-muted px-3 py-1 text-xs font-semibold text-brand">{items?.length ?? 0} included</span></header><div className="divide-y divide-border">{(items ?? []).length === 0 ? <p className="px-6 py-8 text-sm text-muted">No inclusions yet. Add the first one below.</p> : (items ?? []).map((item) => <ItemEditor key={item.id} planId={plan.id} item={item}/>)}</div></section>

    <section className="mt-5 rounded-3xl bg-ink p-6 text-white sm:p-8"><h2 className="font-display text-2xl font-bold tracking-tight">Add an inclusion</h2><p className="mt-2 text-sm text-white/70">Use hours for 1:1 tutoring, and places for a masterclass or workshop.</p><form action={addStudyPlanItemAction} className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><input type="hidden" name="planId" value={plan.id}/><DarkLabel label="Inclusion name" className="lg:col-span-2"><input required name="title" placeholder="e.g. UCAT 1:1 tutoring" className="field-dark"/></DarkLabel><DarkLabel label="Exam focus"><input name="examScope" placeholder="e.g. UCAT" className="field-dark"/></DarkLabel><DarkLabel label="Type"><select name="kind" defaultValue="tutoring" className="field-dark"><option value="tutoring">Tutoring</option><option value="masterclass">Masterclass</option><option value="workshop">Workshop</option><option value="other">Other</option></select></DarkLabel><DarkLabel label="Included amount"><input required min="0.5" step="0.5" type="number" name="totalUnits" placeholder="20" className="field-dark"/></DarkLabel><DarkLabel label="Unit"><select name="unitLabel" defaultValue="hours" className="field-dark"><option value="hours">Hours</option><option value="sessions">Sessions</option><option value="places">Places</option><option value="credits">Credits</option></select></DarkLabel><div className="flex items-end lg:col-span-2"><button type="submit" className="eb-press w-full rounded-full bg-white px-5 py-3 text-sm font-semibold text-ink transition-transform hover:-translate-y-0.5">Add inclusion</button></div></form></section>
    {plan.status !== 'completed' ? <form action={archiveStudyPlanAction} className="mt-5"><input type="hidden" name="planId" value={plan.id}/><button type="submit" className="text-sm font-medium text-muted underline decoration-border underline-offset-4 transition-colors hover:text-foreground">Mark this package completed</button></form> : null}
  </main></Container>
}

function ItemEditor({ planId, item }: { planId: string; item: StudyPlanItem }) {
  return <div className="p-6"><form action={updateStudyPlanItemAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"><input type="hidden" name="planId" value={planId}/><input type="hidden" name="itemId" value={item.id}/><Label label="Inclusion name" className="lg:col-span-2"><input required name="title" defaultValue={item.title} className="field"/></Label><Label label="Exam focus"><input name="examScope" defaultValue={item.exam_scope ?? ''} className="field"/></Label><Label label="Type"><select name="kind" defaultValue={item.kind} className="field"><option value="tutoring">Tutoring</option><option value="masterclass">Masterclass</option><option value="workshop">Workshop</option><option value="other">Other</option></select></Label><Label label="Included"><input required min="0.5" step="0.5" type="number" name="totalUnits" defaultValue={item.total_units} className="field"/></Label><Label label="Used"><input required min="0" step="0.5" type="number" name="usedUnits" defaultValue={item.used_units} className="field"/></Label><Label label="Unit"><select name="unitLabel" defaultValue={item.unit_label} className="field"><option value="hours">Hours</option><option value="sessions">Sessions</option><option value="places">Places</option><option value="credits">Credits</option></select></Label><div className="flex items-end"><button type="submit" className="eb-press w-full rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground">Save</button></div></form><form action={deleteStudyPlanItemAction} className="mt-3"><input type="hidden" name="planId" value={planId}/><input type="hidden" name="itemId" value={item.id}/><button type="submit" className="text-xs font-medium text-muted underline decoration-border underline-offset-4 hover:text-foreground">Remove inclusion</button></form></div>
}
function Label({ label, className = '', children }: { label: string; className?: string; children: React.ReactNode }) { return <label className={`block text-sm font-semibold text-foreground ${className}`}><span>{label}</span><span className="mt-2 block">{children}</span></label> }
function DarkLabel({ label, className = '', children }: { label: string; className?: string; children: React.ReactNode }) { return <label className={`block text-sm font-semibold text-white ${className}`}><span>{label}</span><span className="mt-2 block">{children}</span></label> }
