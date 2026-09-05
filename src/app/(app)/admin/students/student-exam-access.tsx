'use client'

import { useActionState } from 'react'
import { setManualExamAccessAction, type ManualExamAccessState } from '@/lib/admin/student-actions'

export type StudentExamAccessOption = {
  id: string
  name: string
  manualExpiresAt: string | null | undefined
  paidActive: boolean
  paidExpired: boolean
}

export function StudentExamAccess({ userId, email, exams }: { userId: string; email: string; exams: StudentExamAccessOption[] }) {
  const activeCount = exams.filter((exam) => exam.paidActive || isActive(exam.manualExpiresAt)).length

  return <details className="group/access mt-5 rounded-2xl bg-surface-muted/55 open:bg-brand-muted/45">
    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-full px-4 py-2.5 text-sm font-semibold text-foreground outline-none transition-colors hover:text-brand focus-visible:ring-2 focus-visible:ring-brand/40 [&::-webkit-details-marker]:hidden">
      <span className="inline-flex items-center gap-2"><KeyIcon /> Manage Studocyte access</span>
      <span className="inline-flex items-center gap-2"><span className="rounded-full bg-surface px-2.5 py-1 font-mono text-[11px] tabular-nums text-muted">{activeCount} of {exams.length}</span><Chevron /></span>
    </summary>
    <div className="border-t border-border/70 px-4 pb-4 pt-3">
      <p className="max-w-2xl text-xs leading-5 text-muted">Grant full access to an exam without creating a subscription. Paid access stays controlled by Stripe.</p>
      {exams.length ? <div className="mt-3 divide-y divide-border/70">{exams.map((exam) => <ExamAccessRow key={exam.id} userId={userId} email={email} exam={exam} />)}</div> : <p className="mt-3 text-sm text-muted">No active exams are available.</p>}
    </div>
  </details>
}

function ExamAccessRow({ userId, email, exam }: { userId: string; email: string; exam: StudentExamAccessOption }) {
  const [state, action, pending] = useActionState<ManualExamAccessState, FormData>(setManualExamAccessAction, {})
  const manualActive = isActive(exam.manualExpiresAt)
  const hasManualGrant = exam.manualExpiresAt !== undefined
  const status = accessStatus(exam.paidActive, exam.paidExpired, manualActive, hasManualGrant)

  return <section className="py-4 first:pt-1 last:pb-0">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div><div className="flex flex-wrap items-center gap-2"><h4 className="text-sm font-semibold">{exam.name}</h4><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.tone}`}>{status.label}</span></div>{hasManualGrant ? <p className="mt-1 text-xs text-muted">{exam.manualExpiresAt ? `Manual access ends ${formatExpiry(exam.manualExpiresAt)}` : 'Manual access does not expire'}</p> : null}</div>
      <form action={action} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="examId" value={exam.id} />
        <input type="hidden" name="intent" value="grant" />
        <label className="text-[11px] font-semibold text-muted"><span className="mb-1 block">Ends <span className="font-normal">(optional)</span><span className="sr-only"> for {exam.name} access for {email}</span></span><input type="date" name="expiryDate" defaultValue={expiryValue(exam.manualExpiresAt)} min={todayValue()} className="h-9 rounded-full border border-border bg-surface px-3 text-xs text-foreground outline-none transition-colors focus:border-brand" /></label>
        <button type="submit" disabled={pending} aria-label={`${hasManualGrant ? 'Update' : 'Grant'} ${exam.name} manual access for ${email}`} className="eb-press h-9 rounded-full bg-brand px-3.5 text-xs font-semibold text-brand-foreground disabled:cursor-wait disabled:opacity-60">{pending ? 'Saving…' : hasManualGrant ? 'Update' : 'Grant access'}</button>
      </form>
    </div>
    {hasManualGrant ? <form action={action} className="mt-2"><input type="hidden" name="userId" value={userId} /><input type="hidden" name="examId" value={exam.id} /><input type="hidden" name="intent" value="remove" /><button type="submit" disabled={pending} aria-label={`Remove ${exam.name} manual access for ${email}`} className="text-xs font-semibold text-muted underline decoration-border underline-offset-4 hover:text-foreground disabled:cursor-wait disabled:opacity-60">Remove manual access</button></form> : null}
    {state.error || state.message ? <p role={state.error ? 'alert' : 'status'} className={`mt-2 text-xs font-semibold leading-5 ${state.error ? 'text-red-700' : 'text-mint-deep'}`}>{state.error ?? state.message}</p> : null}
  </section>
}

function accessStatus(paidActive: boolean, paidExpired: boolean, manualActive: boolean, hasManualGrant: boolean) {
  if (paidActive && manualActive) return { label: 'Paid + manual', tone: 'bg-mint-muted text-mint-deep' }
  if (paidActive) return { label: 'Paid access', tone: 'bg-mint-muted text-mint-deep' }
  if (manualActive) return { label: 'Manual access', tone: 'bg-brand-muted text-brand' }
  if (paidExpired && hasManualGrant) return { label: 'Paid + manual expired', tone: 'bg-surface text-muted' }
  if (paidExpired) return { label: 'Paid access expired', tone: 'bg-surface text-muted' }
  if (hasManualGrant) return { label: 'Manual access expired', tone: 'bg-surface text-muted' }
  return { label: 'No full access', tone: 'bg-surface text-muted' }
}

function isActive(expiresAt: string | null | undefined) { return expiresAt !== undefined && (expiresAt === null || new Date(expiresAt).getTime() > Date.now()) }
function expiryValue(expiresAt: string | null | undefined) { return expiresAt ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(expiresAt)) : '' }
function todayValue() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()) }
function formatExpiry(expiresAt: string) { return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Australia/Sydney' }).format(new Date(expiresAt)) }
function KeyIcon() { return <svg aria-hidden width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="7" cy="10" r="3.5" /><path d="M10.5 10H17M14 10v3M16 10v2" /></svg> }
function Chevron() { return <svg aria-hidden className="transition-transform duration-200 group-open/access:rotate-180" width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m5 7 5 5 5-5" /></svg> }
