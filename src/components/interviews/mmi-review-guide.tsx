'use client'
import type { ReactNode } from 'react'
import type { MMIAudit, MMIFeedback } from '@/lib/interviews/mmi-feedback'
import { mmiReviewIssues } from '@/lib/interviews/mmi-review-readiness'

export function openReviewTarget(id: string) {
 const target = document.getElementById(id)
 if (!target) {
  const editToggle = document.querySelector<HTMLButtonElement>('[data-mmi-return-to-editing]')
  if (editToggle) {
   editToggle.click()
   requestAnimationFrame(() => { if (document.getElementById(id)) openReviewTarget(id) })
  }
  return
 }
 for (let node: HTMLElement | null = target; node; node = node.parentElement) {
  if (node instanceof HTMLDetailsElement) node.open = true
 }
 target.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
 target.focus({ preventScroll: true })
}
export function ReviewJump({target,children}:{target:string;children:ReactNode}) {
 return <button type="button" onClick={()=>openReviewTarget(target)} className="text-left text-sm font-medium underline decoration-current/40 underline-offset-4 transition-colors hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">{children}</button>
}
export function StudentFieldNote({empty=false,children}:{empty?:boolean;children?:ReactNode}) {
 return <span className={`mt-2 block text-xs ${empty?'font-semibold text-amber-900':'text-brand'}`}>{empty?'Needs writing · ':''}{children??'Student sees this after approval'}</span>
}
export function MMIReviewGuide({value,audit,watched,locked}:{value:MMIFeedback;audit:MMIAudit|null;watched:boolean;locked:boolean}) {
 const issues=mmiReviewIssues(value)
 return <section aria-label="Marking review guide" className="rounded-2xl border border-border bg-surface p-5 sm:p-7">
  <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-2xl font-semibold">Finish this review</h2><span className="rounded-full bg-brand-muted px-3 py-1 text-xs font-semibold text-brand">{locked?'Review closed':'Tutor workspace'}</span></div>
  <p className="mt-2 text-sm text-muted">Check the response, prepare the student’s report, then approve it. Draft text still needs your review even when every field is filled.</p>
  <ol className="mt-5 grid gap-4 md:grid-cols-3">
   <li className="rounded-xl bg-surface-muted p-4"><p className="text-xs font-semibold text-muted">1 · CHECK THE RESPONSE</p><p className="my-2 text-sm">{watched?'Recording review confirmed.':'Review the recording, transcript and suggested marks.'}</p><ReviewJump target="mmi-review-source">Go to recording &amp; assessment</ReviewJump><p className="mt-3 text-xs text-amber-900">{audit?.warnings.length?`${audit.warnings.length} audit ${audit.warnings.length===1?'warning':'warnings'} to review`:audit?'No audit warnings. Check the evidence yourself.':'Audit unavailable. Check the evidence yourself.'}</p><div className="mt-2"><ReviewJump target="mmi-audit-checks">Open evidence checks</ReviewJump></div></li>
   <li className="rounded-xl bg-brand-muted p-4"><p className="text-xs font-semibold text-brand">2 · PREPARE STUDENT FEEDBACK</p><p className="my-2 text-sm">{issues.length?`${issues.length} ${issues.length===1?'item needs':'items need'} attention.`:'Required fields filled. Review the wording and scores.'}</p><ReviewJump target="mmi-student-draft">Go to student feedback</ReviewJump><p className="mt-3 text-xs text-muted">Purple labels show what the student receives. Amber labels flag missing text.</p></li>
   <li className="rounded-xl bg-surface-muted p-4"><p className="text-xs font-semibold text-muted">3 · PREVIEW &amp; APPROVE</p><p className="my-2 text-sm">Use “Preview student report” to read the finished feedback, then confirm your review.</p><ReviewJump target="mmi-release-review">Go to final review</ReviewJump><p className="mt-3 text-xs text-muted">Saving a draft does not send it to the student.</p></li>
  </ol>
  {issues.length>0&&<div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4"><h3 className="text-sm font-semibold text-amber-950">Needs completing</h3><ul className="mt-2 space-y-2 text-amber-950">{issues.map((issue,i)=><li key={`${issue.target}-${i}`}><ReviewJump target={issue.target}>{issue.label}</ReviewJump></li>)}</ul></div>}
 </section>
}
