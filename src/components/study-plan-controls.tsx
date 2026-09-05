'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useFormStatus } from 'react-dom'
import {
  addStudyPlanTaskAction,
  deleteStudyPlanExamDateAction,
  deleteStudyPlanTaskAction,
  saveStudyPlanExamDateAction,
  toggleStudyPlanTaskAction,
  type StudyPlanActionState,
} from '@/lib/study-plans/actions'
import type { ExamKind, StudyPlanExamDate, StudyPlanTask } from '@/lib/supabase/types'

export type StudyPlanExamOption = {
  id: string
  name: string
  slug: string
  kind: ExamKind
}

export function StudyPlanExamDates({ exams, dates }: { exams: StudyPlanExamOption[]; dates: StudyPlanExamDate[] }) {
  if (exams.length === 0) {
    return <section className="rounded-3xl border border-dashed border-border bg-surface px-6 py-8"><h2 className="font-display text-2xl font-semibold tracking-tight">Exam dates</h2><p className="mt-3 max-w-xl text-sm leading-6 text-muted">Your exam date controls will appear here when an exam is unlocked on your account.</p></section>
  }

  return <section className="overflow-hidden rounded-3xl border border-border bg-surface eb-soft">
    <header className="flex flex-col gap-2 border-b border-border px-6 py-5 sm:px-7"><h2 className="font-display text-2xl font-semibold tracking-tight">Exam dates</h2><p className="max-w-2xl text-sm leading-6 text-muted">Set one date for each written exam. Add every university interview as a separate date.</p></header>
    <div className="divide-y divide-border">
      {exams.map((exam) => {
        const examDates = dates.filter((date) => date.exam_id === exam.id)
        return <div key={exam.id} className="px-6 py-6 sm:px-7">
          <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><ExamMonogram name={exam.name} /><div><h3 className="font-display text-lg font-semibold tracking-tight">{exam.name}</h3><p className="text-xs text-muted">{exam.kind === 'interview' ? 'Multiple dates supported' : 'One exam date'}</p></div></div>{examDates.length ? <span className="rounded-full bg-mint-muted px-3 py-1 text-xs font-semibold text-mint-deep">{examDates.length} set</span> : <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-muted">Not set</span>}</div>
          {examDates.length ? <div className="mt-5 space-y-3">{examDates.map((date) => <SavedDateForm key={date.id} exam={exam} date={date} />)}</div> : null}
          {(exam.kind === 'interview' || examDates.length === 0) ? <NewDateForm exam={exam} compact={examDates.length > 0} /> : null}
        </div>
      })}
    </div>
  </section>
}

function SavedDateForm({ exam, date }: { exam: StudyPlanExamOption; date: StudyPlanExamDate }) {
  const [saveState, saveAction] = useActionState(saveStudyPlanExamDateAction, {})
  const [deleteState, deleteAction] = useActionState(deleteStudyPlanExamDateAction, {})
  return <div className="rounded-2xl bg-surface-muted/55 p-3"><div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
    <form action={saveAction} className="grid min-w-0 gap-2 sm:grid-cols-[minmax(9rem,1fr)_minmax(9rem,0.8fr)_auto]">
      <input type="hidden" name="dateId" value={date.id} />
      <input type="hidden" name="examId" value={exam.id} />
      {exam.kind === 'interview' ? <label className="sr-only" htmlFor={`date-label-${date.id}`}>Interview name</label> : null}
      {exam.kind === 'interview' ? <input id={`date-label-${date.id}`} name="label" required maxLength={80} defaultValue={date.label} aria-label="Interview name" className="field bg-surface" /> : <div className="flex min-h-11 items-center px-3 text-sm font-semibold">{exam.name} exam</div>}
      <label className="sr-only" htmlFor={`exam-date-${date.id}`}>{exam.name} date</label>
      <input id={`exam-date-${date.id}`} name="examDate" required type="date" defaultValue={date.exam_date} className="field bg-surface font-mono tabular-nums" />
      <PendingButton label="Save" pendingLabel="Saving…" className="bg-ink text-white" />
    </form>
    <form action={deleteAction} className="flex items-center justify-end">
      <input type="hidden" name="dateId" value={date.id} />
      <PendingButton label="Remove" pendingLabel="Removing…" className="border border-border bg-surface text-muted hover:text-foreground" />
    </form></div>
    <ActionMessage state={saveState.error || saveState.success ? saveState : deleteState} />
  </div>
}

function NewDateForm({ exam, compact }: { exam: StudyPlanExamOption; compact: boolean }) {
  const [state, action] = useActionState(saveStudyPlanExamDateAction, {})
  const formRef = useRef<HTMLFormElement>(null)
  useEffect(() => { if (state.success) formRef.current?.reset() }, [state.success])
  return <div className={compact ? 'mt-3 rounded-2xl border border-dashed border-border p-3' : 'mt-5'}><form ref={formRef} action={action} className="grid gap-2 sm:grid-cols-[minmax(9rem,1fr)_minmax(9rem,0.8fr)_auto]">
    <input type="hidden" name="examId" value={exam.id} />
    {exam.kind === 'interview' ? <><label className="sr-only" htmlFor={`new-label-${exam.id}`}>University or interview name</label><input id={`new-label-${exam.id}`} name="label" required maxLength={80} placeholder="e.g. UQ MMI" className="field" /></> : <div className="flex min-h-11 items-center px-3 text-sm text-muted">Choose your exam date</div>}
    <label className="sr-only" htmlFor={`new-date-${exam.id}`}>{exam.name} date</label>
    <input id={`new-date-${exam.id}`} name="examDate" required type="date" className="field font-mono tabular-nums" />
    <PendingButton label={exam.kind === 'interview' && compact ? 'Add another' : 'Set date'} pendingLabel="Saving…" className="bg-brand text-brand-foreground" />
  </form><ActionMessage state={state} /></div>
}

export function StudyPlanChecklist({ exams, tasks }: { exams: StudyPlanExamOption[]; tasks: StudyPlanTask[] }) {
  const remaining = tasks.filter((task) => !task.is_completed).length
  const examById = new Map(exams.map((exam) => [exam.id, exam]))
  const [state, action] = useActionState(addStudyPlanTaskAction, {})
  const formRef = useRef<HTMLFormElement>(null)
  useEffect(() => { if (state.success) formRef.current?.reset() }, [state.success])
  return <section className="overflow-hidden rounded-3xl border border-border bg-surface eb-soft">
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-6 py-5 sm:px-7"><div><h2 className="font-display text-2xl font-semibold tracking-tight">Notes &amp; checklist</h2><p className="mt-2 max-w-xl text-sm leading-6 text-muted">Keep the next useful action visible across every exam.</p></div><span className="rounded-full bg-brand-muted px-3 py-1.5 font-mono text-xs font-semibold tabular-nums text-brand">{remaining} to do</span></header>
    <form ref={formRef} action={action} className="grid gap-3 border-b border-border bg-surface-muted/45 px-6 py-5 sm:grid-cols-[minmax(0,1fr)_10rem_auto] sm:px-7">
      <label className="sr-only" htmlFor="study-plan-task">Add a study note or task</label>
      <input id="study-plan-task" name="body" required maxLength={240} placeholder="Add a note or next task…" className="field bg-surface" />
      <label className="sr-only" htmlFor="study-plan-task-exam">Exam</label>
      <select id="study-plan-task-exam" name="examId" className="field bg-surface"><option value="">All exams</option>{exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.name}</option>)}</select>
      <PendingButton label="Add" pendingLabel="Adding…" className="bg-brand text-brand-foreground" />
      <ActionMessage state={state} className="sm:col-span-3" />
    </form>
    {tasks.length ? <ol className="divide-y divide-border">{tasks.map((task) => <TaskRow key={task.id} task={task} examName={task.exam_id ? examById.get(task.exam_id)?.name ?? 'Exam' : 'All exams'} />)}</ol> : <p className="px-6 py-8 text-sm leading-6 text-muted sm:px-7">Add a reminder, homework item or practice goal. It will stay here for future sessions.</p>}
  </section>
}

function TaskRow({ task, examName }: { task: StudyPlanTask; examName: string }) {
  const [toggleState, toggleAction] = useActionState(toggleStudyPlanTaskAction, {})
  const [deleteState, deleteAction] = useActionState(deleteStudyPlanTaskAction, {})
  return <li className="px-6 py-4 sm:px-7"><div className="flex items-start gap-3"><form action={toggleAction} className="pt-0.5"><input type="hidden" name="taskId" value={task.id} /><input type="hidden" name="isCompleted" value={String(!task.is_completed)} /><button type="submit" aria-label={task.is_completed ? `Mark ${task.body} as incomplete` : `Mark ${task.body} as complete`} className={`grid h-6 w-6 place-items-center rounded-full border transition-colors ${task.is_completed ? 'border-mint bg-mint text-white' : 'border-border bg-surface hover:border-brand'}`}>{task.is_completed ? <CheckIcon /> : null}</button></form><div className="min-w-0 flex-1"><p className={`text-sm leading-6 ${task.is_completed ? 'text-muted line-through decoration-border' : 'text-foreground'}`}>{task.body}</p><p className="mt-1 text-xs text-muted">{examName}</p></div><form action={deleteAction}><input type="hidden" name="taskId" value={task.id} /><button type="submit" className="rounded-full px-2 py-1 text-xs font-semibold text-muted transition-colors hover:bg-surface-muted hover:text-foreground">Remove</button></form></div><ActionMessage state={toggleState.error || toggleState.success ? toggleState : deleteState} /></li>
}

function PendingButton({ label, pendingLabel, className }: { label: string; pendingLabel: string; className: string }) {
  const { pending } = useFormStatus()
  return <button type="submit" disabled={pending} className={`eb-press inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold transition-colors disabled:cursor-wait disabled:opacity-60 ${className}`}>{pending ? pendingLabel : label}</button>
}

function ActionMessage({ state, className = '' }: { state: StudyPlanActionState; className?: string }) {
  if (!state.error && !state.success) return null
  return <p role={state.error ? 'alert' : 'status'} className={`mt-2 text-xs font-semibold ${state.error ? 'text-red-700' : 'text-mint-deep'} ${className}`}>{state.error ?? state.success}</p>
}

function ExamMonogram({ name }: { name: string }) { return <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-muted font-display text-sm font-bold text-brand" aria-hidden>{name.slice(0, 1)}</span> }
function CheckIcon() { return <svg aria-hidden width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 10 3 3 7-7" /></svg> }
