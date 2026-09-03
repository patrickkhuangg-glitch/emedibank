import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/container'
import { requireAdmin } from '@/lib/auth/dal'
import { setSubtestFreeAction } from '@/lib/admin/actions'
import { createClient } from '@/lib/supabase/server'
import type { Subtest } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Admin · Content access' }

export default async function AdminAccessPage() {
  await requireAdmin()
  const supabase = await createClient()
  const [{ data: exams }, { data: subtests }] = await Promise.all([
    supabase.from('exams').select('id,name,active').order('created_at'),
    supabase.from('subtests').select('*').order('sort_order'),
  ])
  const byExam = new Map<string, Subtest[]>()
  for (const section of subtests ?? []) byExam.set(section.exam_id, [...(byExam.get(section.exam_id) ?? []), section])
  const free = (subtests ?? []).filter((section) => section.is_free).length

  return <Container className="py-10 sm:py-14"><main className="mx-auto max-w-4xl">
    <Link href="/admin" className="text-sm font-medium text-muted transition-colors hover:text-foreground">← Admin dashboard</Link>
    <div className="mt-5 flex flex-col gap-4 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between"><div><p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-brand">Student access</p><h1 className="mt-2 font-display text-4xl font-bold tracking-tight">Free content controls</h1><p className="mt-3 max-w-2xl text-muted">A free section bypasses subscription gating for every signed-in student. Changes take effect immediately.</p></div><div className="rounded-2xl bg-brand-muted px-5 py-3"><p className="font-mono text-2xl font-semibold text-brand tabular-nums">{free}/{subtests?.length ?? 0}</p><p className="text-xs text-muted">sections free</p></div></div>

    <div className="mt-8 space-y-5">{(exams ?? []).map((exam) => {
      const list = byExam.get(exam.id) ?? []
      return <section key={exam.id} className="overflow-hidden rounded-2xl border border-border bg-surface"><header className="flex items-center justify-between bg-surface-muted/65 px-5 py-3"><h2 className="font-semibold">{exam.name}</h2>{!exam.active && <span className="font-mono text-[10px] uppercase tracking-wider text-muted">Inactive exam</span>}</header>
        {list.length === 0 ? <p className="px-5 py-6 text-sm text-muted">No sections have been configured.</p> : <div className="divide-y divide-border">{list.map((section) => <div key={section.id} className="flex items-center justify-between gap-4 px-5 py-4"><div><p className="font-medium">{section.name}</p><p className="mt-0.5 text-xs text-muted">{section.is_free ? 'Available without a subscription' : 'Requires exam entitlement'}</p></div><form action={setSubtestFreeAction}><input type="hidden" name="subtestId" value={section.id}/><input type="hidden" name="isFree" value={String(!section.is_free)}/><button type="submit" aria-label={section.is_free ? `Gate ${section.name}` : `Make ${section.name} free`} className={`eb-press min-w-20 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${section.is_free ? 'bg-success-muted text-success hover:brightness-95' : 'bg-surface-muted text-muted hover:text-foreground'}`}>{section.is_free ? 'Free ✓' : 'Gated'}</button></form></div>)}</div>}
      </section>
    })}</div>
    <aside className="mt-6 rounded-2xl border border-brand/15 bg-brand-muted/40 px-5 py-4 text-sm leading-6 text-muted"><strong className="text-foreground">Important:</strong> this controls section-level access only. Free full Practice Tests and package entitlements are configured separately.</aside>
  </main></Container>
}
