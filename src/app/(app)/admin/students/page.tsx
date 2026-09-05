import type { Metadata } from 'next'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { Container } from '@/components/container'
import { requireAdmin } from '@/lib/auth/dal'
import { createAdminClient } from '@/lib/supabase/admin'
import type { UserRole } from '@/lib/supabase/types'
import { AccountAccessActions } from './account-access-actions'
import { InviteStudentForm } from './invite-student-form'
import { StudentExamAccess, type StudentExamAccessOption } from './student-exam-access'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Admin · Accounts' }

type AccountProfile = { id: string; full_name: string | null; phone_number: string | null; role: UserRole }
type Account = { user: User; profile?: AccountProfile }
type AccountExam = { id: string; name: string }
type AccountEntitlement = { user_id: string; exam_id: string; source: 'subscription' | 'bundle' | 'comp'; expires_at: string | null }

export default async function AdminStudentsPage() {
  await requireAdmin()
  const admin = createAdminClient()
  const { data: userData, error: userError } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const users = (userData?.users ?? []).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const ids = users.map((user) => user.id)
  const { data: profiles, error: profileError } = ids.length ? await admin.from('profiles').select('id,full_name,phone_number,role').in('id', ids) : { data: [] as AccountProfile[], error: null }
  if (userError || profileError) return <AccountsLoadError />
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile as AccountProfile]))
  const accounts = users.map((user) => ({ user, profile: profileById.get(user.id) }))
  const students = accounts.filter((account) => (account.profile?.role ?? 'student') === 'student')
  const staff = accounts.filter((account) => account.profile?.role === 'tutor' || account.profile?.role === 'admin')
  const studentIds = students.map((account) => account.user.id)
  const [{ data: exams, error: examError }, entitlementResult] = await Promise.all([
    admin.from('exams').select('id,name').eq('active', true).order('created_at'),
    studentIds.length
      ? admin.from('entitlements').select('user_id,exam_id,source,expires_at').in('user_id', studentIds)
      : Promise.resolve({ data: [] as AccountEntitlement[], error: null }),
  ])
  if (examError || entitlementResult.error) return <AccountsLoadError />
  const examList = (exams ?? []) as AccountExam[]
  const entitlementsByUser = groupEntitlements((entitlementResult.data ?? []) as AccountEntitlement[])

  return <Container className="py-10 sm:py-14"><main className="mx-auto max-w-6xl">
    <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-foreground"><BackIcon /> Admin dashboard</Link>
    <header className="mt-5 flex flex-col gap-6 border-b border-border pb-8 lg:flex-row lg:items-end lg:justify-between"><div><h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Accounts</h1><p className="mt-3 max-w-2xl text-base leading-7 text-muted">Create student and tutor accounts, restore access, and keep each group easy to scan.</p></div><dl className="grid w-fit grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border"><AccountCount value={students.length} label="Students" /><AccountCount value={staff.length} label="Tutors & admins" /></dl></header>

    <section className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <div className="space-y-5">
        <AccountPanel title="Students" description="Student profiles, exam access, packages and account emails." count={students.length} empty="No student accounts yet.">
          {students.map((account) => <AccountRow key={account.user.id} account={account} studentAccess={buildStudentAccess(examList, entitlementsByUser.get(account.user.id) ?? [])} />)}
        </AccountPanel>
        <AccountPanel title="Tutors & admins" description="Staff accounts are kept separate from the student list." count={staff.length} empty="No tutor or admin accounts yet.">
          {staff.map((account) => <AccountRow key={account.user.id} account={account} />)}
        </AccountPanel>
      </div>
      <section className="h-fit rounded-3xl bg-ink p-6 text-white eb-soft lg:sticky lg:top-24"><h2 className="font-display text-2xl font-bold tracking-tight">Create account</h2><p className="mt-2 text-sm leading-6 text-white/70">Choose student or tutor, add their details, then send a secure invitation to choose their password.</p><InviteStudentForm /></section>
    </section>
  </main></Container>
}

function AccountsLoadError() {
  return <Container className="py-10 sm:py-14"><main className="mx-auto max-w-6xl"><Link href="/admin" className="inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-foreground"><BackIcon /> Admin dashboard</Link><header className="mt-5 border-b border-border pb-8"><h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Accounts</h1><p className="mt-3 max-w-2xl text-base leading-7 text-muted">Create student and tutor accounts, restore access, and keep each group easy to scan.</p></header><section className="mt-8 rounded-3xl border border-border bg-surface p-8 eb-soft"><h2 className="font-display text-2xl font-bold tracking-tight">Accounts could not load</h2><p className="mt-2 max-w-xl text-sm leading-6 text-muted">No account information has been changed. Refresh the page to try the secure connection again.</p><a href="/admin/students" className="eb-press mt-6 inline-flex min-h-10 items-center justify-center rounded-full bg-brand px-5 text-sm font-semibold text-brand-foreground">Try again</a></section></main></Container>
}

function AccountPanel({ title, description, count, empty, children }: { title: string; description: string; count: number; empty: string; children: React.ReactNode }) {
  return <section className="overflow-hidden rounded-3xl border border-border bg-surface eb-soft"><header className="flex flex-col gap-3 border-b border-border px-6 py-5 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="font-display text-2xl font-bold tracking-tight">{title}</h2><p className="mt-1 text-sm leading-6 text-muted">{description}</p></div><span className="w-fit rounded-full bg-surface-muted px-3 py-1 font-mono text-xs font-semibold tabular-nums text-muted">{count}</span></header>{count ? <div className="divide-y divide-border">{children}</div> : <p className="px-6 py-10 text-sm text-muted">{empty}</p>}</section>
}

function AccountRow({ account, studentAccess }: { account: Account; studentAccess?: StudentExamAccessOption[] }) {
  const { user, profile } = account
  const email = user.email ?? ''
  const role = profile?.role ?? 'student'
  return <article className="px-6 py-5"><div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{profile?.full_name || email || 'Unnamed account'}</h3><RolePill role={role} /><AccountStatus user={user} /></div><p className="mt-1 break-all text-sm text-muted">{email}</p>{profile?.phone_number ? <p className="mt-1 text-sm text-muted">{profile.phone_number}</p> : null}<p className="mt-2 font-mono text-[11px] tabular-nums text-muted">Added {formatDate(user.created_at)}</p></div><div className="flex flex-col items-start gap-3 xl:items-end">{role !== 'admin' && email ? <AccountAccessActions userId={user.id} email={email} /> : <p className="max-w-xs text-xs leading-5 text-muted">Admin login security is managed from that administrator&rsquo;s Account page.</p>}{studentAccess && email ? <Link href={`/admin/study-plans?student=${encodeURIComponent(email)}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:text-foreground">Add package <ArrowRight /></Link> : null}</div></div>{studentAccess && email ? <StudentExamAccess userId={user.id} email={email} exams={studentAccess} /> : null}</article>
}

function AccountStatus({ user }: { user: User }) {
  const state = !user.email_confirmed_at ? { label: 'Invite pending', tone: 'bg-brand-muted text-brand' } : !user.last_sign_in_at ? { label: 'Ready to sign in', tone: 'bg-surface-muted text-muted' } : { label: 'Active', tone: 'bg-mint-muted text-mint-deep' }
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${state.tone}`}>{state.label}</span>
}

function RolePill({ role }: { role: UserRole }) {
  const tone = role === 'admin' ? 'bg-ink text-white' : role === 'tutor' ? 'bg-brand-muted text-brand' : 'bg-surface-muted text-muted'
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${tone}`}>{role}</span>
}

function AccountCount({ value, label }: { value: number; label: string }) { return <div className="min-w-28 bg-surface px-4 py-3"><dt className="text-xs text-muted">{label}</dt><dd className="mt-1 font-mono text-xl font-semibold tabular-nums text-foreground">{value}</dd></div> }
function groupEntitlements(entitlements: AccountEntitlement[]) { const grouped = new Map<string, AccountEntitlement[]>(); for (const entitlement of entitlements) grouped.set(entitlement.user_id, [...(grouped.get(entitlement.user_id) ?? []), entitlement]); return grouped }
function buildStudentAccess(exams: AccountExam[], entitlements: AccountEntitlement[]): StudentExamAccessOption[] { const now = Date.now(); return exams.map((exam) => { const manual = entitlements.find((entitlement) => entitlement.exam_id === exam.id && entitlement.source === 'comp'); const paid = entitlements.filter((entitlement) => entitlement.exam_id === exam.id && entitlement.source !== 'comp'); const paidActive = paid.some((entitlement) => entitlement.expires_at === null || new Date(entitlement.expires_at).getTime() > now); return { id: exam.id, name: exam.name, manualExpiresAt: manual ? manual.expires_at : undefined, paidActive, paidExpired: paid.length > 0 && !paidActive } }) }
function formatDate(value: string) { return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Australia/Sydney' }).format(new Date(value)) }
function BackIcon() { return <svg aria-hidden width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 10H4M8 6l-4 4 4 4" /></svg> }
function ArrowRight() { return <svg aria-hidden width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10h12M12 6l4 4-4 4" /></svg> }
