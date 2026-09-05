'use client'

import { useActionState, useEffect, useId, useRef, useState } from 'react'
import { deleteManagedAccountAction, updateManagedAccountAction, type ManageAccountState } from '@/lib/admin/student-actions'

type EditableRole = 'student' | 'tutor'

export function AccountManagement({ userId, email, fullName, phoneNumber, role }: { userId: string; email: string; fullName: string; phoneNumber: string; role: EditableRole }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [showDelete, setShowDelete] = useState(false)
  const [confirmationEmail, setConfirmationEmail] = useState('')
  const [updateState, updateAction, updatePending] = useActionState<ManageAccountState, FormData>(updateManagedAccountAction, {})
  const [deleteState, deleteAction, deletePending] = useActionState<ManageAccountState, FormData>(deleteManagedAccountAction, {})
  const challengeMatches = confirmationEmail.trim().toLowerCase() === email.toLowerCase()

  useEffect(() => {
    if (deleteState.deleted) dialogRef.current?.close()
  }, [deleteState.deleted])

  function openDialog() {
    setShowDelete(false)
    setConfirmationEmail('')
    dialogRef.current?.showModal()
  }

  return <>
    <button type="button" onClick={openDialog} className="eb-press inline-flex min-h-9 items-center justify-center rounded-full border border-border bg-surface px-3.5 text-xs font-semibold text-foreground transition-colors hover:border-brand/30 hover:bg-brand-muted">Edit account</button>
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => { if (updatePending || deletePending) event.preventDefault() }}
      onClick={(event) => { if (event.target === event.currentTarget && !updatePending && !deletePending) dialogRef.current?.close() }}
      className="eb-soft m-auto max-h-[calc(100dvh-2rem)] w-[min(38rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl bg-surface p-0 text-foreground backdrop:bg-ink/50 backdrop:backdrop-blur-[2px] open:animate-[eb-pop_180ms_cubic-bezier(0.16,1,0.3,1)] motion-reduce:animate-none"
    >
      <div className="sticky top-0 z-10 flex items-start justify-between gap-6 border-b border-border bg-surface px-5 py-4 sm:px-7 sm:py-5">
        <div className="min-w-0"><h2 id={titleId} className="font-display text-2xl font-semibold tracking-tight">Edit account</h2><p className="mt-1 truncate text-sm text-muted">{email}</p></div>
        <button type="button" disabled={updatePending || deletePending} onClick={() => dialogRef.current?.close()} aria-label="Close account editor" className="eb-press grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-surface transition-colors hover:bg-surface-muted disabled:cursor-wait disabled:opacity-50"><CloseIcon /></button>
      </div>

      <div className="px-5 py-6 sm:px-7">
        <form key={`${fullName}-${email}-${phoneNumber}-${role}`} action={updateAction} className="space-y-4">
          <input type="hidden" name="userId" value={userId} />
          <label className="block text-sm font-semibold"><span>Account type</span><select name="accountRole" defaultValue={role} className="field mt-2 text-base sm:text-sm"><option value="student">Student</option><option value="tutor">Tutor</option></select></label>
          <label className="block text-sm font-semibold"><span>Full name</span><input required minLength={2} maxLength={120} name="fullName" autoComplete="name" defaultValue={fullName} className="field mt-2 text-base sm:text-sm" /></label>
          <label className="block text-sm font-semibold"><span>Email address</span><input required maxLength={254} type="email" name="email" autoComplete="email" defaultValue={email} className="field mt-2 text-base sm:text-sm" /></label>
          <label className="block text-sm font-semibold"><span>Mobile number</span><input required maxLength={24} type="tel" name="phoneNumber" autoComplete="tel" defaultValue={phoneNumber} placeholder="04xx xxx xxx" className="field mt-2 text-base sm:text-sm" /></label>
          {updateState.error || updateState.message ? <p role={updateState.error ? 'alert' : 'status'} className={`rounded-2xl px-4 py-3 text-sm leading-6 ${updateState.error ? 'bg-red-50 font-semibold text-red-700' : 'bg-mint-muted text-mint-deep'}`}>{updateState.error ?? updateState.message}</p> : null}
          <div className="flex flex-wrap justify-end gap-2 pt-1"><button type="button" disabled={updatePending} onClick={() => dialogRef.current?.close()} className="eb-press min-h-11 rounded-full border border-border bg-surface px-5 text-sm font-semibold transition-colors hover:bg-surface-muted disabled:opacity-50">Cancel</button><button type="submit" disabled={updatePending || deletePending} className="eb-press min-h-11 rounded-full bg-brand px-5 text-sm font-semibold text-brand-foreground disabled:cursor-wait disabled:opacity-60">{updatePending ? 'Saving…' : 'Save changes'}</button></div>
        </form>

        <section className="mt-7 border-t border-border pt-6" aria-labelledby={`${titleId}-delete`}>
          <h3 id={`${titleId}-delete`} className="font-display text-lg font-semibold tracking-tight">Delete account</h3>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted">Permanently removes the account, packages, progress and saved interview recordings. This cannot be undone.</p>
          {!showDelete ? <button type="button" onClick={() => setShowDelete(true)} className="eb-press mt-4 min-h-10 rounded-full border border-red-200 bg-surface px-4 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50">Delete account…</button> : <form action={deleteAction} className="mt-5 rounded-2xl bg-red-50 p-4 sm:p-5">
            <input type="hidden" name="userId" value={userId} />
            <p className="text-sm font-semibold text-red-900">Confirm permanent deletion</p>
            <label className="mt-3 block text-sm leading-6 text-red-900" htmlFor={`${titleId}-confirmation`}>Type <strong className="break-all">{email}</strong> to continue.</label>
            <input id={`${titleId}-confirmation`} name="confirmationEmail" type="email" autoComplete="off" value={confirmationEmail} onChange={(event) => setConfirmationEmail(event.target.value)} className="field mt-2 bg-surface text-base sm:text-sm" />
            {deleteState.error ? <p role="alert" className="mt-3 text-sm font-semibold leading-6 text-red-700">{deleteState.error}</p> : null}
            <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={deletePending} onClick={() => { setShowDelete(false); setConfirmationEmail('') }} className="eb-press min-h-10 rounded-full border border-red-200 bg-surface px-4 text-sm font-semibold text-foreground disabled:opacity-50">Keep account</button><button type="submit" disabled={!challengeMatches || deletePending || updatePending} className="eb-press min-h-10 rounded-full bg-red-700 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{deletePending ? 'Deleting…' : 'Permanently delete'}</button></div>
          </form>}
        </section>
      </div>
    </dialog>
  </>
}

function CloseIcon() { return <svg aria-hidden width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="m5 5 10 10M15 5 5 15" /></svg> }
