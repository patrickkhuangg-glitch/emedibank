import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/container'
import { requireAdmin } from '@/lib/auth/dal'
import { createAdminClient } from '@/lib/supabase/admin'
import { InviteStudentForm } from './invite-student-form'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Admin · Students' }

export default async function AdminStudentsPage() {
  await requireAdmin()
  const admin = createAdminClient()
  const { data: userData } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const users = (userData?.users ?? []).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const ids = users.map((user) => user.id)
  const { data: profiles } = ids.length ? await admin.from('profiles').select('id,full_name,phone_number,role').in('id', ids) : { data: [] as { id: string; full_name: string | null; phone_number: string | null; role: string }[] }
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]))

  return <Container className="py-10 sm:py-14"><main className="mx-auto max-w-6xl">
    <Link href="/admin" className="text-sm font-medium text-muted transition-colors hover:text-foreground">← Admin dashboard</Link>
    <header className="mt-5 grid gap-6 border-b border-border pb-8 lg:grid-cols-[1fr_auto] lg:items-end"><div><h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Students</h1><p className="mt-3 max-w-2xl text-base leading-7 text-muted">Create a complete student account, send their secure invitation, then add any tutoring package from the same workspace.</p></div><span className="rounded-2xl bg-brand-muted px-5 py-3 font-mono text-2xl font-semibold tabular-nums text-brand">{users.length}</span></header>
    <section className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]"><div className="overflow-hidden rounded-3xl border border-border bg-surface"><header className="flex items-center justify-between border-b border-border px-6 py-5"><h2 className="font-display text-2xl font-bold tracking-tight">Accounts</h2><Link href="/admin/study-plans" className="text-sm font-semibold text-brand hover:text-foreground">Study plans →</Link></header>{users.length === 0 ? <p className="px-6 py-12 text-center text-sm text-muted">No accounts yet.</p> : <div className="divide-y divide-border">{users.map((user) => { const profile = profileById.get(user.id); const email = user.email ?? ''; return <div key={user.id} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{profile?.full_name || user.email || 'Unnamed student'}</p><p className="mt-1 text-sm text-muted">{user.email}{profile?.phone_number ? <span className="px-1.5 text-border">·</span> : null}{profile?.phone_number}</p></div><div className="flex flex-wrap items-center gap-3"><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${profile?.role === 'admin' ? 'bg-brand-muted text-brand' : 'bg-surface-muted text-muted'}`}>{profile?.role ?? 'student'}</span>{profile?.role !== 'admin' ? <Link href={`/admin/study-plans?student=${encodeURIComponent(email)}`} className="text-sm font-semibold text-brand hover:text-foreground">Add package</Link> : null}<span className="font-mono text-[11px] text-muted tabular-nums">{formatDate(user.created_at)}</span></div></div> })}</div>}</div>
      <section className="h-fit rounded-3xl bg-ink p-6 text-white"><h2 className="font-display text-2xl font-bold tracking-tight">Create student</h2><p className="mt-2 text-sm leading-6 text-white/70">Add their contact details now. They&rsquo;ll receive a secure invitation and choose their own password.</p><InviteStudentForm /></section>
    </section>
  </main></Container>
}

function formatDate(value: string) { return new Date(value).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) }
